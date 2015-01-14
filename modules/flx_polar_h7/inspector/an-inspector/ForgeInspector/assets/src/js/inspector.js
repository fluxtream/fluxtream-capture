forge.inspector = {
	getFixture: function (module, file) {
		var location = window.location.href;
		var url = decodeURI(location.substring(0, location.length-(10 + window.location.search.length + window.location.hash.length)));
		url = url + 'fixtures/' + module + (file.substring(0, 1) == '/' ? '' : '/') + file;
		return {
			uri: url
		};
	}
}

$(function () {
	forge.internal.call('inspector.list', {}, function (methods) {
		var modules = {};
		for (method in methods) {
			var parts = method.split('.');
			apimethod = parts.pop();
			var module = parts.join('.');
			if (!modules[module]) {
				modules[module] = {};
			}
			modules[module][apimethod] = methods[method];
		}
		for (module in modules) {
			$('#_module').append('<option>'+module+'</option>');
			$('#_module').val('flx_polar_h7');
		}
		$('#_module').change(function () {
			var methods = modules[$(this).val()]; 
			$('#_method').html('');
			for (method in methods) {
				$('#_method').append('<option>'+method+'</option>');
			}
			$('#_method').change();
		})
		$('#_module').change();
		$('#_method').change(function () {
			var module = $('#_module').val();
			var method = $(this).val(); 
			var params = modules[module][method];
			$('.api_input').detach();
			for (param in params) {
				$('#_actions').before('<div class="control-group api_input"><label class="control-label" for="'+param+'">'+param+'</label><div class="controls"><input type="text" class="input-xlarge" id="'+param+'"></div></div>');
			}
		});
		$('#_method').change();
		$('#_run').click(function () {
			var module = $('#_module').val();
			var method = $('#_method').val();
	    var paramTypes = modules[module][method];
			var params = {};
			
			$('.api_input input').each(function (i, x) {
        switch (paramTypes[$(x).attr('id')].type) {
          case 'int': params[$(x).attr('id')] = parseInt($(x).val()); break;
          case 'long': params[$(x).attr('id')] = parseInt($(x).val()); break;
          case 'double': params[$(x).attr('id')] = parseFloat($(x).val()); break;
          default: params[$(x).attr('id')] = $(x).val();
        }
			});
			
			$('#_output').prepend('<pre class="alert alert-info">Called "'+module+'.'+method+'" with "'+JSON.stringify(params, null, '')+'"</pre>');
			forge.internal.call(module+'.'+method, params, function () {
				$('#_output').prepend('<pre class="alert alert-success">Success for "'+module+'.'+method+'" with "'+JSON.stringify(arguments[0], null, '')+'"</pre>');
			}, function () {
				$('#_output').prepend('<pre class="alert alert-error">Error for "'+module+'.'+method+'" with "'+JSON.stringify(arguments[0], null, '')+'"</pre>');
			})
		});
	}, function () {
		alert("Error");
	});
	forge.internal.addEventListener('*', function (event, e) {
		if (event == 'inspector.eventTriggered') {
			$('#_output').prepend('<pre class="alert alert-warning">Native event triggered "'+e.name+'"</pre>');
		} else if (event == 'inspector.eventInvoked') {
			if (e['class'] == 'ForgeEventListener') {
				$('#_output').prepend('<pre class="alert alert-warning">Default event listener for "'+e.name+'" called</pre>');
			} else {
				$('#_output').prepend('<pre class="alert alert-warning">Calling event listener "'+e.name+'" in class "'+e['class']+'"</pre>');
			}
		} else {
			$('#_output').prepend('<pre class="alert alert-warning">Javascript event "'+event+'" triggered with data "'+JSON.stringify(e)+'"</pre>');
		}
	});
});