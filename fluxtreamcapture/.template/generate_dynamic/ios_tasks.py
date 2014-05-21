import datetime
from glob import glob
import logging
import os
from os import path
import plistlib
import re
import subprocess
import tempfile
import time
import shutil
import sys
from zipfile import ZipFile, ZIP_DEFLATED
from copy import deepcopy

from module_dynamic import lib
from module_dynamic.lib import temp_file
from lib import task, ensure_lib_available
from module_dynamic.utils import run_shell, ProcessGroup
from module_dynamic.utils import which

LOG = logging.getLogger(__name__)

SIMULATOR_IN_42 = "/Developer/Platforms/iPhoneSimulator.platform/Developer/Applications/iPhone Simulator.app/"
SIMULATOR_IN_43 = "/Applications/Xcode.app/Contents/Developer/Platforms/iPhoneSimulator.platform/Developer/Applications/iPhone Simulator.app"

class IOSError(lib.BASE_EXCEPTION):
	pass

class IOSRunner(object):
	def __init__(self, path_to_ios_build):
		# TODO: should allow us to cd straight to where the ios build is
		# at the moment this points one level above, e.g. my-app/development,
		# NOT my-app/development/ios
		self.path_to_ios_build = path_to_ios_build
		self.provisioning_profile = None

	def _missing_provisioning_profile(self, build, path_to_pp):
		lib.local_config_problem(
			build,
			message="Couldn't find the specified provisioning profile at {path}".format(path=path_to_pp),
			examples={
				"ios.profiles.DEFAULT.provisioning_profile": os.path.abspath("/path/to/embedded.profile")
			},
			more_info="https://trigger.io/docs/current/tools/local_config.html"
		)

	def _grab_plist_from_binary_mess(self, build, file_path):
		start_marker = '<?xml version="1.0" encoding="UTF-8"?>'
		end_marker = '</plist>'
		
		if not path.isfile(file_path):
			self._missing_provisioning_profile(build, file_path)

		with open(file_path, 'rb') as plist_file:
			plist = plist_file.read()
		start = plist.find(start_marker)
		end = plist.find(end_marker)
		if start < 0 or end < 0:
			raise ValueError("{0} does not appear to be a valid provisioning profile".format(file_path))
		
		real_plist = plist[start:end+len(end_marker)]
		return real_plist
	
	def _parse_plist(self, plist):
		return plistlib.readPlistFromString(plist)
		
	def _extract_seed_id(self):
		'E.g. "DEADBEEDAA" from provisioning profile plist including "DEADBEEDAA.*"'
		app_ids = self.provisioning_profile["ApplicationIdentifierPrefix"]
		if not app_ids:
			raise ValueError("Couldn't find an 'ApplicationIdentifierPrefix' entry in your provisioning profile")
		return app_ids[0]

	def _extract_app_id(self):
		'E.g. "DEADBEEFAA.io.trigger.forge.app" from provisioning profile plist, only works for distribution profiles'
		entitlements = self.provisioning_profile["Entitlements"]
		if not entitlements:
			raise ValueError("Couldn't find an 'Entitlements' entry in your provisioning profile")
		app_id = entitlements['application-identifier']
		if not app_id:
			raise ValueError("Couldn't find an 'application-identifier' entry in your provisioning profile")
		return app_id
	
	def _is_distribution_profile(self):
		'See if the profile has a false get-task-allow (i.e. is app store or adhoc distribution'
		return not self.provisioning_profile['Entitlements']['get-task-allow']

	def _check_for_codesign(self):
		which_codesign = subprocess.Popen(['which', 'codesign'], stdout=subprocess.PIPE)
		stdout, stderr = which_codesign.communicate()
		
		if which_codesign.returncode != 0:
			raise IOError("Couldn't find the codesign command. Make sure you have xcode installed and codesign in your PATH.")
		return stdout.strip()

	def get_bundled_ai(self, application_id_prefix, path_to_ios_build):
		'''
		returns the application identifier, with bundle id
		'''
		# biplist import must be done here, as in the server context, biplist doesn't exist
		import biplist
		
		info_plist_path = glob(path_to_ios_build + '/ios' + '/device-*')[0] + '/Info.plist'
		return "%s.%s" % (
			application_id_prefix,
			biplist.readPlist(info_plist_path)['CFBundleIdentifier']
		)

	def check_plist_dict(self, plist_dict, path_to_ios_build):
		'''
		Raises an IOSError on:
		 - Expired profile
		 - invalid Entitlements
		'''
		if plist_dict['ExpirationDate'] < datetime.datetime.now():
			raise IOSError("Provisioning profile has expired")
			
		ai_from_provisioning_prof = plist_dict['Entitlements']['application-identifier']
		provisioning_profile_bundle = ai_from_provisioning_prof.partition('.')[2]
		
		ai_from_built_app = self.get_bundled_ai(
				plist_dict['ApplicationIdentifierPrefix'][0],
				path_to_ios_build)
		
		if ai_from_provisioning_prof == ai_from_built_app:
			LOG.debug("Application ID in app and provisioning profile match")
		elif ai_from_provisioning_prof.endswith("*") and ai_from_provisioning_prof[:-1] == ai_from_built_app[:len(ai_from_provisioning_prof)-1]:
			LOG.debug("Provisioning profile has valid wildcard application ID")
		else:
			raise IOSError('''Provisioning profile and application ID do not match

	ID in your provisioning profile: {pp_id}
	ID in your app:                  {app_id}

You probably want to change the App configuration's package name in the Toolkit, or add something like this to config.json:

	"core": {{
	    "ios": {{
	        "package_name": "{pp_bundle}"
	    }}
	}}

See "Preparing your apps for app stores" in our docs: [https://trigger.io/docs/current/recipes/release/release_mobile.html]'''.format(
				pp_id=ai_from_provisioning_prof,
				app_id=ai_from_built_app,
				pp_bundle=provisioning_profile_bundle,
				)
			)
			
	def plist_supports_wireless_distribution(self, plist_dict):
		return not plist_dict['Entitlements']['get-task-allow'] and ('ProvisionedDevices' in plist_dict or 'ProvisionsAllDevices' in plist_dict)
			
	def log_profile(self):
		'''
		Logs:
		name
		number of enabled devices (with ids)
		appstore profile or development
		'''
		if len(self.provisioning_profile.get('ProvisionedDevices', [])) > 0:
			
			LOG.info(str(len(self.provisioning_profile['ProvisionedDevices'])) + ' Provisioned Device(s):')
			LOG.info(self.provisioning_profile['ProvisionedDevices'])
		else:
			LOG.info('No Provisioned Devices, profile is Appstore')
	
	def _sign_app(self, build, provisioning_profile, entitlements_file, certificate=None, certificate_path=None, certificate_password=None, ident=None):
		app_folder_name = self._locate_ios_app(error_message="Couldn't find iOS app in order to sign it")
		path_to_app = path.abspath(path.join(self.path_to_ios_build, 'ios', app_folder_name))

		embedded_profile = 'embedded.mobileprovision'
		path_to_embedded_profile = path.abspath(path.join(path_to_app, embedded_profile))

		path_to_pp = path.join(build.orig_wd, provisioning_profile)
		if not path.isfile(path_to_pp):
			self._missing_provisioning_profile(build, path_to_pp)

		try:
			os.remove(path_to_embedded_profile)
		except Exception:
			LOG.warning("Couldn't remove {profile}".format(profile=path_to_embedded_profile))
		shutil.copy2(path_to_pp, path_to_embedded_profile)
		
		if not sys.platform.startswith('darwin'):
			if not certificate_path:
				lib.local_config_problem(
					build,
					message="To deploy iOS apps to a device, you must specify a "
						"path to a certificate to sign with.",
					examples={
						"ios.profiles.DEFAULT.developer_certificate_path": path.abspath("/Users/Bob/certificate.pfx")
					},
					more_info="https://trigger.io/docs/current/tools/local_config.html"
				)

			if not certificate_password:
				lib.local_config_problem(
					build,
					message="To deploy iOS apps to a device, you must specify a "
						"path the password to unlock your certificate.",
					examples={
						"ios.profiles.DEFAULT.developer_certificate_password": "mypassword"
					},
					more_info="https://trigger.io/docs/current/tools/local_config.html"
				)

			resource_rules = path.abspath(path.join(path_to_app, 'ResourceRules.plist'))
			run_shell('java', '-jar', ensure_lib_available(build, 'codesign.jar'),
					'--app', path_to_app,
					'--binary', 'Forge',
					'--certificate', certificate_path,
					'--entitlements', entitlements_file,
					'--ident', ident,
					'--password', certificate_password)
		else:
			# Local
			codesign = self._check_for_codesign()
			resource_rules = path.abspath(path.join(path_to_app, 'ResourceRules.plist'))
			run_shell(codesign, '--force', '--preserve-metadata',
					'--entitlements', entitlements_file,
					'--sign', certificate,
					'--resource-rules={0}'.format(resource_rules),
					path_to_app)

	def _select_certificate(self, certificate):
		if certificate is not None:
			return certificate
		else:
			if self._is_distribution_profile():
				return 'iPhone Distribution'
			else:
				return 'iPhone Developer'

	def _create_entitlements_file(self, build, temp_file_path, plist_dict):
		bundle_id = self._extract_app_id()

		entitlements_dict = plist_dict['Entitlements']
		entitlements_dict['application-identifier'] = bundle_id
		
		# Remove iCloud keys as they need configuring rather than just copying from the provisioning profile
		if 'com.apple.developer.ubiquity-container-identifiers' in entitlements_dict:
			entitlements_dict.pop('com.apple.developer.ubiquity-container-identifiers')
		if 'com.apple.developer.ubiquity-kvstore-identifier' in entitlements_dict:
			entitlements_dict.pop('com.apple.developer.ubiquity-kvstore-identifier')

		with open(temp_file_path, 'wb') as temp_file:
			plistlib.writePlist(entitlements_dict, temp_file)
	
	def create_ipa_from_app(self, build, provisioning_profile, output_path_for_ipa, certificate_to_sign_with=None, relative_path_to_itunes_artwork=None, certificate_path=None, certificate_password=None, output_path_for_manifest=None):
		"""Create an ipa from an app, with an embedded provisioning profile provided by the user, and
		signed with a certificate provided by the user.

		:param build: instance of build
		:param provisioning_profile: Absolute path to the provisioning profile to embed in the ipa
		:param output_path_for_ipa: Path to save the created IPA
		:param certificate_to_sign_with: (Optional) The name of the certificate to sign the ipa with
		:param relative_path_to_itunes_artwork: (Optional) A path to a 512x512 png picture for the App view in iTunes.
			This should be relative to the location of the user assets.
		"""

		LOG.info('Starting package process for iOS')
		
		directory = path.dirname(output_path_for_ipa)
		if not path.isdir(directory):
			os.makedirs(directory)

		app_folder_name = self._locate_ios_app(error_message="Couldn't find iOS app in order to sign it")
		path_to_app = path.abspath(path.join(self.path_to_ios_build, 'ios', app_folder_name))
		
		LOG.info('Going to package: %s' % path_to_app)
		
		plist_str = self._grab_plist_from_binary_mess(build, provisioning_profile)
		plist_dict = self._parse_plist(plist_str)
		self.check_plist_dict(plist_dict, self.path_to_ios_build)
		self.provisioning_profile = plist_dict
		LOG.info("Plist OK")

		# use distribution cert automatically if PP is distribution
		certificate_to_sign_with = self._select_certificate(certificate_to_sign_with)

		self.log_profile()
		
		seed_id = self._extract_seed_id()
		
		LOG.debug("Extracted seed ID: {0}".format(seed_id))
		
		with lib.temp_dir() as temp_dir:
			LOG.debug('Making Payload directory')
			os.mkdir(path.join(temp_dir, 'Payload'))

			path_to_payload = path.abspath(path.join(temp_dir, 'Payload'))
			path_to_payload_app = path.abspath(path.join(path_to_payload, app_folder_name))

			if relative_path_to_itunes_artwork is not None:
				path_to_itunes_artwork = path.join(path_to_payload_app, 'assets', 'src', relative_path_to_itunes_artwork)
			else:
				path_to_itunes_artwork = None

			with temp_file() as temp_file_path:
				self._create_entitlements_file(build, temp_file_path, plist_dict)
				self._sign_app(build=build,
					provisioning_profile=provisioning_profile,
					certificate=certificate_to_sign_with,
					entitlements_file=temp_file_path,
					certificate_path=certificate_path,
					certificate_password=certificate_password,
					ident=_generate_package_name(build)
				)
			
			shutil.copytree(path_to_app, path.join(path_to_payload, path.basename(path_to_app)))
			
			if path_to_itunes_artwork:
				shutil.copy2(path_to_itunes_artwork, path.join(temp_dir, 'iTunesArtwork'))

			with ZipFile(output_path_for_ipa, 'w', compression=ZIP_DEFLATED) as out_ipa:
				for root, dirs, files in os.walk(temp_dir):
					for file in files:
						LOG.debug('adding to IPA: {file}'.format(
							file=path.join(root, file),
						))
						out_ipa.write(path.join(root, file), path.join(root[len(temp_dir):], file))

		LOG.info("created IPA: {output}".format(output=output_path_for_ipa))
		
		if output_path_for_manifest and self.plist_supports_wireless_distribution(plist_dict):
			LOG.info("Provisioning profile supports wireless distributions, creating manifest: %s" % output_path_for_manifest)
			# Based on https://help.apple.com/iosdeployment-apps/#app43ad78b3
			manifest = {"items": [{
				"assets": [{
					"kind": "software-package",
					"url": "http://www.example.com/app.ipa"
				},{
					"kind": "display-image",
					"needs-shine": True,
					"url": "http://www.example.com/image.57x57.png",
				},{
					"kind": "full-size-image",
					"needs-shine": True,
					"url": "http://www.example.com/image.512x512.jpg",
				}],
				"metadata": {
					"bundle-identifier": _generate_package_name(build),
					"bundle-version": build.config['version'],
					"kind": "software",
					"title": build.config['name']
				}
			}]}
			with open(output_path_for_manifest, 'wb') as manifest_file:
				plistlib.writePlist(manifest, manifest_file)
			
		return output_path_for_ipa

	def _locate_ios_app(self, error_message):
		ios_build_dir = path.join(self.path_to_ios_build, 'ios')
		possible_apps = glob(path.join(ios_build_dir, 'device-*.app/'))

		if not possible_apps:
			raise IOError(error_message)

		return path.basename(path.dirname(possible_apps[0]))
	
	def run_iphone_simulator(self, build):
		if not sys.platform.startswith('darwin'):
			lib.local_config_problem(
				build,
				message="iOS Simulator is only available on OS X, please change the iOS run settings in your local config to 'device' or a specific device.",
				examples={
					"ios.device": "device",
				},
				more_info="https://trigger.io/docs/current/tools/local_config.html"
			)
	
		possible_app_location = '{0}/ios/simulator-*/'.format(self.path_to_ios_build)
		LOG.debug('Looking for apps at {0}'.format(possible_app_location))
		possible_apps = glob(possible_app_location)
		if not possible_apps:
			raise IOSError("Couldn't find iOS app to run it in the simulator")
		
		path_to_app = possible_apps[0]
		
		LOG.debug('Trying to run app %s' % path_to_app)

		if path.exists(SIMULATOR_IN_43):
			LOG.debug("Detected XCode version 4.3 or newer")
			ios_sim_binary = "ios-sim-xc4.3"
		elif path.exists(SIMULATOR_IN_42):
			LOG.debug("Detected XCode version 4.2 or older")
			ios_sim_binary = "ios-sim-xc4.2"
		else:
			raise IOSError("Couldn't find iOS simulator in {old} or {new}, if you want to use the iOS simulator then you need to install XCode".format(
				old=SIMULATOR_IN_42,
				new=SIMULATOR_IN_43,
			))

		def could_not_start_simulator(line):
			return line.startswith("[DEBUG] Could not start simulator")

		try:
			logfile = tempfile.mkstemp()[1]
			process_group = ProcessGroup()

			ios_sim_cmd = [path.join(self._lib_path(), ios_sim_binary), "launch", path_to_app, '--stderr', logfile]

			sdk = build.tool_config.get('ios.simulatorsdk')
			if sdk is not None:
				ios_sim_cmd = ios_sim_cmd + ['--sdk', sdk]
			family = build.tool_config.get('ios.simulatorfamily')
			if family is not None:
				ios_sim_cmd = ios_sim_cmd + ['--family', family]
			variant = build.tool_config.get('ios.simulatorvariant')
			if variant == "retina":
				ios_sim_cmd = ios_sim_cmd + ['--retina']
			elif variant == "tall":
				ios_sim_cmd = ios_sim_cmd + ['--retina', '--tall']
			elif variant == "64bit":
				ios_sim_cmd = ios_sim_cmd + ['--retina', '--tall', '--64bit']

			LOG.info('Starting simulator')
			process_group.spawn(
				ios_sim_cmd,
				fail_if=could_not_start_simulator,
				command_log_level=logging.INFO
			)

			LOG.info('Showing log output:')
			process_group.spawn(
				["tail", "-f", logfile],
				command_log_level=logging.INFO
			)

			process_group.wait_for_success()
		finally:
			os.remove(logfile)
	
	def run_idevice(self, build, device, provisioning_profile, certificate=None, certificate_path=None, certificate_password=None):
		possible_app_location = '{0}/ios/device-*/'.format(self.path_to_ios_build)
		LOG.debug('Looking for apps at {0}'.format(possible_app_location))
		possible_apps = glob(possible_app_location)
		if not possible_apps:
			raise IOSError("Couldn't find iOS app to run on a device")
		
		path_to_app = possible_apps[0]

		LOG.debug("Signing {app}".format(app=path_to_app))
		
		plist_str = self._grab_plist_from_binary_mess(build, provisioning_profile)
		plist_dict = self._parse_plist(plist_str)
		self.check_plist_dict(plist_dict, self.path_to_ios_build)
		self.provisioning_profile = plist_dict
		LOG.info("Plist OK")

		certificate = self._select_certificate(certificate)
		self.log_profile()
		
		if sys.platform.startswith('darwin'):
			with temp_file() as temp_file_path:
				self._create_entitlements_file(build, temp_file_path, plist_dict)
				
				self._sign_app(build=build,
					provisioning_profile=provisioning_profile,
					certificate=certificate,
					entitlements_file=temp_file_path,
					ident=_generate_package_name(build)
				)
			
			fruitstrap = [ensure_lib_available(build, 'fruitstrap'), '-d', '-u', '-t', '10', '-b', path_to_app]
			if device and device.lower() != 'device':
				# pacific device given
				fruitstrap.append('-i')
				fruitstrap.append(device)
				LOG.info('Installing app on device {device}: is it connected?'.format(device=device))
			else:
				LOG.info('Installing app on device: is it connected?')

			def filter_and_combine(logline):
				return logline.rstrip()

			ensure_lib_available(build, 'lldb_framework.zip', extract=True)

			env = deepcopy(os.environ)
			env['PATH'] = os.path.dirname(ensure_lib_available(build, 'lldb'))+":"+env['PATH']

			run_shell(*fruitstrap, fail_silently=False, command_log_level=logging.INFO, filter=filter_and_combine, check_for_interrupt=True, env=env)
		elif sys.platform.startswith('win'):
			with temp_file() as ipa_path:
				self.create_ipa_from_app(
					build=build,
					provisioning_profile=provisioning_profile,
					output_path_for_ipa=ipa_path,
					certificate_path=certificate_path,
					certificate_password=certificate_password,
				)
				win_ios_install = [ensure_lib_available(build, 'win-ios-install.exe')]
				if device and device.lower() != 'device':
					# pacific device given
					win_ios_install.append(device)
					LOG.info('Installing app on device {device}: is it connected?'.format(device=device))
				else:
					LOG.info('Installing app on device: is it connected?')

				win_ios_install.append(ipa_path)
				win_ios_install.append(_generate_package_name(build))

				run_shell(*win_ios_install, fail_silently=False, command_log_level=logging.INFO, check_for_interrupt=True)
		else:
			if not which('ideviceinstaller'):
				raise Exception("Can't find ideviceinstaller - is it installed and on your PATH?")
			with temp_file() as ipa_path:
				self.create_ipa_from_app(
					build=build,
					provisioning_profile=provisioning_profile,
					output_path_for_ipa=ipa_path,
					certificate_path=certificate_path,
					certificate_password=certificate_password,
				)
				
				linux_ios_install = ['ideviceinstaller']
				
				if device and device.lower() != 'device':
					# pacific device given
					linux_ios_install.append('-U')
					linux_ios_install.append(device)
					LOG.info('Installing app on device {device}: is it connected?'.format(device=device))
				else:
					LOG.info('Installing app on device: is it connected?')
				
				linux_ios_install.append('-i')
				linux_ios_install.append(ipa_path)
				run_shell(*linux_ios_install, fail_silently=False,
					command_log_level=logging.INFO,
					check_for_interrupt=True)
				LOG.info('App installed, you will need to run the app on the device manually.')
	
	def _lib_path(self):
		return path.abspath(path.join(
			self.path_to_ios_build,
			path.pardir,
			'.template',
			'lib',
		))

@task
def run_ios(build, device):
	runner = IOSRunner(path.abspath('development'))

	if not device or device.lower() == 'simulator':
		LOG.info('Running iOS Simulator')
		runner.run_iphone_simulator(build)
	else:
		LOG.info('Running on iOS device: {device}'.format(device=device))
		certificate_to_sign_with = build.tool_config.get('ios.profile.developer_certificate')
		provisioning_profile = build.tool_config.get('ios.profile.provisioning_profile')
		if not provisioning_profile:
			lib.local_config_problem(
				build,
				message="You must specify a provisioning profile.",
				examples={
					"ios.profiles.DEFAULT.provisioning_profile": os.path.abspath("/path/to/embedded.profile")
				},
				more_info="https://trigger.io/docs/current/tools/local_config.html"
			)

		certificate_path = build.tool_config.get('ios.profile.developer_certificate_path')
		certificate_password = build.tool_config.get('ios.profile.developer_certificate_password')
		
		runner.run_idevice(
			build=build,
			device=device, provisioning_profile=provisioning_profile,
			certificate=certificate_to_sign_with,
			certificate_path=certificate_path,
			certificate_password=certificate_password,
		)

@task
def package_ios(build):
	provisioning_profile = build.tool_config.get('ios.profile.provisioning_profile')
	if not provisioning_profile:
		lib.local_config_problem(
			build,
			message="You must specify a provisioning profile.",
			examples={
				"ios.profiles.DEFAULT.provisioning_profile": os.path.abspath("/path/to/embedded.profile")
			},
			more_info="https://trigger.io/docs/current/tools/local_config.html"
		)
	certificate_to_sign_with = build.tool_config.get('ios.profile.developer_certificate')
	certificate_path = build.tool_config.get('ios.profile.developer_certificate_path', '')
	certificate_password = build.tool_config.get('ios.profile.developer_certificate_password', '')

	runner = IOSRunner(path.abspath('development'))
	try:
		relative_path_to_itunes_artwork = build.config['modules']['icons']['config']['ios']['512']
	except KeyError:
		relative_path_to_itunes_artwork = None

	file_name = "{name}-{time}".format(
		name=re.sub("[^a-zA-Z0-9]", "", build.config["name"].lower()),
		time=str(int(time.time()))
	)
	output_path_for_ipa = path.abspath(path.join('release', 'ios', file_name+'.ipa'))
	output_path_for_manifest = path.abspath(path.join('release', 'ios', file_name+'-WirelessDistribution.plist'))
	runner.create_ipa_from_app(
		build=build,
		provisioning_profile=provisioning_profile,
		certificate_to_sign_with=certificate_to_sign_with,
		relative_path_to_itunes_artwork=relative_path_to_itunes_artwork,
		output_path_for_ipa=output_path_for_ipa,
		certificate_path=certificate_path,
		certificate_password=certificate_password,
		output_path_for_manifest=output_path_for_manifest,
	)

def _generate_package_name(build):
	if "core" not in build.config:
		build.config["core"] = {}
	if "ios" not in build.config["core"]:
		build.config["core"]["ios"] = {}
	if "package_name" not in build.config["core"]["ios"]:
		build.config["core"]["ios"]["package_name"] = "io.trigger.forge"+build.config["uuid"]
	return build.config["core"]["ios"]["package_name"]
