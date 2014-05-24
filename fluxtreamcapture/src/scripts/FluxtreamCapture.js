define(
    [ "core/FlxState" ],
    function (FlxState) {

        var App = {};

        App.apps = {};

        var compiledTemplates = {};

        App.initialize = function() {
            loadApps();
        };

        function loadApps() {
            var then = new Date().getTime();
            var appModules = FlxState.apps.map(function (appName) {
                return "applications/" + appName + "/App";
            });
            require(appModules, function (/* apps */) {

                for (var i = 0; i < arguments.length; i++) {
                    var app = arguments[i];
                    App.apps[app.name] = app;
                    app.initialize();
                }

                loadAppTemplates();
                var now = new Date().getTime();
                forge.logging.info("app is now fully initialized: " + (now-then) + " ms");
            });
        }

        function renderAppTemplate(app, html) {
            var appDiv = $("<div/>", {
                class: "application",
                id: app.name + "-app"
            }).addClass("dormant").html(html);
            $("#applications").append(appDiv);
        }

        function loadAppTemplates() {
            forge.logging.info("loading app templates");
            var apps = _.values(App.apps),
                appTemplates = apps.map(function (app) {
                    return "text!applications/" + app.name + "/template.html";
                });
            require(appTemplates, function (/* templates */) {
                for (var i = 0; i < arguments.length; i++) {
                    renderAppTemplate(apps[i], arguments[i]);
                    apps[i].setup();
                }
                setupURLRouting();
            });
        }

        function setupURLRouting() {

            function renderDefault(app) {
                maybeSwapApps(app);
                App.activeApp.renderDefaultState();
            }

            function render(app, state) {
                maybeSwapApps(app);
                App.activeApp.renderState(state);
            }

            function invalidPath() {
                require([ "text!applications/invalidPath.html"], function(html) {
                    $(".application").removeClass("active");
                    $(".application").addClass("dormant");
                    $("#applications").append(html);
                });
            }

            FlxState.router.route("*path", "default", function(path) {
                console.log("default route: path=" + path);
                var appName = FlxState.defaultApp,
                    app = App.apps[appName];
                renderDefault(app);
            });
            FlxState.router.route("app/:name", "app-default", function(appName) {
                console.log("app-default route: name=" + appName);
                var app = App.apps[appName];
                renderDefault(app);
            });
            FlxState.router.route("app/:name/*state", "app", function(appName, state) {
                console.log("app route: name=" + appName + ", state=" + state);
                var app = App.apps[appName];
                if (_.isUndefined(app)) {
                    console.log("invalid app: " + appName);
                    invalidPath();
                }
                // strip trailing slash from state, if any
                if (state.endsWith("/")) {
                    state = state.slice(0, -1);
                }
                FlxState.saveState(appName, state);
                state = app.parseState(state);
                if (state === null) {
                    console.log("invalid state: " + state);
                    invalidPath();
                    return;
                }
                render(app, state);
            });

            function maybeSwapApps(app) {

                function setAppDivEnabled(app, enabled) {
                    var appDiv = $("#" + app.name + "-app");
                    appDiv.toggleClass("active", enabled);
                    appDiv.toggleClass("dormant", !enabled);
                }

                // TODO: add destroy()/setup() calls again...
                $(".appMenuBtn.active").removeClass("active");
                $("#"+app.name+"MenuButton").addClass('active');
                var appChanged = app !== App.activeApp;
                if (appChanged) {
                    if (!_.isUndefined(App.activeApp)) {
                        setAppDivEnabled(App.activeApp, false);
                    }
                    App.activeApp = app;
                }
                setAppDivEnabled(app, true);
            }

            if (!Backbone.history.start({pushState : window.history && window.history.pushState})) {
                console.log("error loading routes!");
            }
        }


        window.App = App;
        return App;
    });


