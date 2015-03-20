define(["jquery", "app/eventBus", "app/renderers"], function($, eventBus, renderer){
    var keepProfiling = false;

    eventBus.on("rendered", function() {
        var currCmd = renderer.getCommand();
        var profilerActionSelector;
        if (currCmd == "getClassLocations") {
             $(".ui-layout-center .data .level1 li span").before(function(){return "<input type='checkbox' class='node-selector'></input>";});
            profilerActionSelector = renderProfilerAction();
            addProfilerEventHandler(profilerActionSelector);
        }
    });

    eventBus.on('displayProfiledResults', function(event) {
        var profiledData = event.detail;
        if (keepProfiling) {
            $(".ui-layout-center .data").html(profiledData);
        }
    });

    function renderProfilerAction() {
        var profilerActionId = 'profilingAction';
        $(".ui-layout-center .data .jsonview").after("<button class='btn btn-primary' id='"+profilerActionId+"' type='button'>Start Profiling</button>");
        return "#"+profilerActionId;
    }

    function addProfilerEventHandler(selector) {
        $(selector).on('click', function(){
            if (keepProfiling) {
                eventBus.emit("stopProfiling"); 
                keepProfiling = false;
                $(selector).html('Start Profiling');
            } else {
                var classLocations = [];
                $(".ui-layout-center .level1 li input:checkbox:checked").each(function(){
                    classLocations.push($(this).next('span').text().replace(/"/g,'').replace("file:",""));
                });
                
                if (classLocations.length > 0) {
                    eventBus.emit("startProfiling", classLocations);
                    keepProfiling = true; 
                    $(selector).html('Stop Profiling');
                } else {
                    keepProfiling = false; 
                    renderer.showHelp("Must select at least one jar")
                }
            }
        });
    }
});
