define(["jquery", "app/eventBus", "app/renderers", "app/commandManager", "app/treeRenderer", "app/datasource"], function($, eventBus, renderer, commandManager, treeRenderer, ds){
    var keepProfiling = false;

    renderer.registerRenderer("tree", treeRenderer.render);
    commandManager
        .registerCommand("startProfiling",
                         function profileVM(fulfill, reject, classLocations, vmId) {
                             ds.forJSON("/vms/profile", 
                                        {'vmId': ''+vmId, 'locations':classLocations}, 'POST')
                                 .then(function(data){
                                     fulfill(data);
                                 });
                         },
                         "starts profiling the currently selected VM", true);

    commandManager
        .registerCommand("stopProfiling",
                         function stopProfiling(fulfill, reject, param, vmId) {
                             ds.forJSON("/vms/unprofile", 
                                        {'vmId': ''+vmId}, 'POST')
                                 .then(function(data){
                                     fulfill(data);
                                 });
                         },
                         "stops profiling the currently selected VM", true);

    commandManager
        .registerCommand("getProfiledResults",
                         function(fulfill, reject, param, vmId) {
                             commandManager.runCommandOnVM(fulfill, reject, "get-all-entries", vmId, "/vms/rawresponse");
                         },
                         "gets results of the current profiling info", true);

    eventBus.on("rendered", function() {
        var currCmd = renderer.getCommand();
        var profilerActionSelector;
        if (currCmd == "getClassLocations") {
            renderer.getMainSection(".data .level1 li span").before(function(){return "<input type='checkbox' class='node-selector'></input>";});
            profilerActionSelector = renderProfilerAction();
            addProfilerEventHandler(profilerActionSelector);
        }
    });

    eventBus.on('startProfiling', function(event) {
        keepProfiling = true;
        commandManager
            .runCommand('startProfiling', event.detail)
            .onSuccess(function(data) {
                eventBus.emit('updateProfiledResults');
            });
    });

    eventBus.on('stopProfiling', function(event) {
        keepProfiling = false;
        commandManager
            .runCommand('stopProfiling')
            .onSuccess(function(data) {
                eventBus.emit('stoppedProfiling');
            });

    });

    eventBus.on('updateProfiledResults', function(event) {
        commandManager
            .runCommand('getProfiledResults')
            .onSuccess(function(data) {
                eventBus.emit('displayProfiledResults', data);
            })
            .onFailure(function(data) {
                renderer.showHelp("No data yet from the profiler, continuing the profiling");
            });
        if (keepProfiling) {
            setTimeout(function(){eventBus.emit('updateProfiledResults');}, 5000);
        }
    });



    eventBus.on('displayProfiledResults', function(event) {
        var profiledData = event.detail;
        var dataActionSelector = null;
        if (keepProfiling) {
            profiledData = (profiledData)? profiledData.response: null;
            if (profiledData && profiledData.length > 0) {
                dataActionSelector = createDataAction();
                treeRenderer.render("body > .ui-layout-center > .data .data-profiler", createTree(profiledData));
            }
        }
    });

    eventBus.on('forceKeepProfiling', function() {keepProfiling = true});

    function createDataAction() {
        renderer.getMainSection(".data .data-action").remove();
        renderer.getMainSection(".data").append("<div class='data-profiler'></div>");
        return ".data .data-profiler";
    }
    function renderProfilerAction() {
        var profilerActionId = 'profilingAction';
        renderer.getMainSection(".data").append("<button class='btn btn-primary' id='"+profilerActionId+"' type='button'>Start Profiling</button>");
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
                renderer.getMainSection(".level1 li input:checkbox:checked").each(function(){
                    classLocations.push($(this).next('span').text().replace(/"/g,'').replace("file:",""));
                });
                
                if (classLocations.length > 0) {
                    eventBus.emit("startProfiling", classLocations);
                    keepProfiling = true; 
                    $(selector).html('Stop Profiling');
                } else {
                    keepProfiling = false; 
                    renderer.showHelp("Must select at least one jar");
                }
            }
        });
    }

    function createTree(data) {
        var parser = /(\d*) (\d*) (start|end) (\S*) (\S*)/;
        var entries = data.split("~#");
        var splits = null;
        var i = 0;
        var root = new Node("Trace of all invoked methods");
        var parentChain = {};
        for (i = 0; i < entries.length; i++) {
            splits = parser.exec(entries[i]);
            if (splits) {
                processNode(parentChain, splits);
            }
        }
        for (i in parentChain) {
            root.addChild(parentChain[i][0]);
        }
        return root;
    }

    function processNode(parentChain, splits) {
        var tId, threadParent;
        if (splits[3] === "start") {
            var entry = new Node("child", splits);
            threadParent = parentChain[entry.tId];
            if (threadParent) {
                console.log("already has a thread parent for "+entry.tId);
            } else {
                threadParent = [];
                threadParent.push(new Node("Thread "+entry.tId));
                parentChain[entry.tId] = threadParent;
            }
            threadParent[threadParent.length - 1].addChild(entry);
            threadParent.push(entry);
        } else {
            threadParent = parentChain[splits[1]];
            if (threadParent) {
                // mark it as end of last entry for this thread and pop it from parent chain
                threadParent.splice(-1, 1);
            } else {
                console.log("Tree may be in bad state, no start for "+JSON.stringify(splits));
            }
        }
    }

    function Node(name, splits) {
        if (splits) {
            this.tId =splits[1];
            this.tstamp = splits[2];
            this.state=splits[3]; 
            this.clsName=splits[4]; 
            this.unQualifiedMethodName=splits[5];
            this.methodName = splits[4].replace(/\//g,".") + "." + splits[5]+"()";
        } else {
            this.methodName = name;
        }
        this.children = [];

        this.addChild = function(entry) {
            this.children.push(entry);
        };
    }

    function meToString(d, mDepth, cDepth) {
        var str = "", i;
        str = (d.tId)? d.tId + " " + d.tstamp + " " + d.state + " " + d.clsName + " " + d.unQualifiedMethodName
            +"~#": "";
        if (d.children && cDepth < mDepth) {
            for (i = 0; i < d.children.length; i++){
                str += meToString(d.children[i], mDepth, cDepth + 1);
            } 
        }
        str += (d.tId)? d.tId + " " + d.tstamp + " end "  + d.clsName + " " + d.unQualifiedMethodName
            +"~#": "";
        return str;
    }

//var eb = require('app/eventBus');
///$("body > .ui-layout-center > .data").html('<div class="data-profiler"></div>')
//eb.emit('forceKeepProfiling');
//eb.emit('displayProfiledResults', {"response":data});

});
