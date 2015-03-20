define(["jquery", "app/renderers", "app/commandManager", "app/eventBus","jquery-layout", "jquery-jsonview", "app/decorators" ], function($, renderer, commandManager, eventBus, decorators) {

    var showHelp = renderer.showHelp;
    var keepProfiling = false;

    function getHelpDisplayer(msg) {
        return function(){
            showHelp(msg);
        }
    }

    function attachToVM(event) {
        var vmId, errMsg = 'please click on the vm id value';
        try{ 
            vmId = parseInt($(event.target).text()); 
            if (vmId) {
                showHelp("Trying to attach to vm, will show active functions on connect");
                commandManager
                    .runCommand("attachToVM", vmId)
                    .onSuccess(function(){
                        updateAttachedVMList(vmId);
                        getHelpDisplayer("Attach completed, running default command after attach");
                        setTimeout(function() { eventBus.emit("vmChanged", vmId)}, 1000);
                    })
                    .onFailure(getHelpDisplayer("Attach Failed"));
                return false;
            } else {
                errMsg = "Failed to attach";
            }
        }catch(error){
            console.log(error);
        }
        showHelp(errMsg);
        return false;
    }

    function updateAttachedVMList(vmId) {
        commandManager
            .runCommand("listAttachedVMs")
            .onSuccess(function(data) {
                renderer.renderAttachedVMs(data, vmId);
            });
    }


    $(function() {
	    var pageLayout = $('body').layout({
		    resizeWhileDragging	: true,
		    north__slidable : false,
		    north__resizable : false,
		    north__spacing_open:0,
		    north__closable : false,
		    west__size:	"25%",
		    west__initClosed : false,
		    onresize : function(){
			    resetSectionSize();
		    }
	    });

        eventBus.setDelegate($('body')[0]);

        eventBus.on("appStarted", function() {
            eventBus.emit("listVMs");
        });

        eventBus.on("listVMs", function() {
            commandManager
                .runCommand("listVMs")
                .onSuccess(function(data) {
                    renderer
                        .renderView(data)
                        .addHandler('click', attachToVM);
                });
            updateAttachedVMList();
        });

        eventBus.on("vmChanged", function(event) {
            commandManager.setCurrentVM(event.detail);
            renderer.renderCommands(commandManager.getCommands());
            eventBus.emit("runCommand", 'dumpThreads');
       });

        eventBus.on('runCommand', function(event) {
            var cmd = event.detail;
            renderer.setCommand(cmd);
            eventBus.emit('commandChanged');
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
                    showHelp("No data yet from the profiler, continuing the profiling");
                });
            if (keepProfiling) {
                setTimeout(function(){eventBus.emit('updateProfiledResults');}, 2000);
            }
        });

        eventBus.on('commandChanged', function(event) {
            var newCommand = renderer.getCommand();
            if (newCommand != "none") {
                commandManager
                    .runCommand(newCommand)
                    .onSuccess(function(data) {
                        renderer.renderMain(data);
                    });
            }
        });

        $('#user-commands').on('change', function(){
            eventBus.emit('commandChanged');
        });

        $('#attached-vms').on('change', function(event){
            var vmId = $(event.target).val();
            eventBus.emit('vmChanged', vmId);
        });

        eventBus.emit("appStarted");
    });
});
