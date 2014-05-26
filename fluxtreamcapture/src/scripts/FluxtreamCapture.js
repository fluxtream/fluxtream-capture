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
            });
        }

        function renderAppTemplate(app, html) {
            var appDiv = $("<div/>", { class: "application", id: app.name + "-app" }).addClass("dormant").html(html);
            $("#flx-applications").append(appDiv);
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

            FlxState.router.route("", "default", function(path) {
                console.log("default route: path=" + path);
                var appName = FlxState.defaultApp,
                    app = App.apps[appName];
                renderDefault(app);
            });

            FlxState.router.route(":name", "app-default", function(appName) {
                console.log("app-default route: name=" + appName);
                var app = App.apps[appName];
                renderDefault(app);
            });

            FlxState.router.route(":name/*state", "app", function(appName, state) {
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

                $("#menu").hide();

                function setAppDivEnabled(app, enabled) {
                    var appDiv = $("#" + app.name + "-app");
                    appDiv.toggleClass("active", enabled);
                    appDiv.toggleClass("dormant", !enabled);
                }
                var appChanged = app !== App.activeApp;
                if (appChanged) {
                    if (!_.isUndefined(App.activeApp)) {
                        setAppDivEnabled(App.activeApp, false);
                    }
                    App.activeApp = app;
                }

                setAppDivEnabled(app, true);

                $(".navbar-text.app-name").html(app.prettyName);
                $("#flx-applications").show();

                var scrollPosition = app.scrollPosition;
                forge.logging.debug("restoring scrollPosition to " + scrollPosition);
                $(window).scrollTop(scrollPosition);
            }

            if (!Backbone.history.start({pushState : window.history && window.history.pushState})) {
                forge.logging.error("error loading routes!");
            }
        };

        App.renderMenu = function() {
            var scrollPosition = $(window).scrollTop();
            forge.logging.debug("saving scrollPosition: " + scrollPosition);
            $("#flx-applications").hide();
            App.activeApp.scrollPosition = scrollPosition;
            $(".navbar-text.app-name").html("");
            $("#menu").show();
        };

        App.renderApp = function(appName, state, params) {
            var app = App.apps[appName];
            if (_.isUndefined(state)) {
                state = FlxState.getState(appName);
            }
            app.navigateState(state,params);
        };

        window.App = App;
        return App;
    });


