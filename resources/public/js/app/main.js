define(["jquery", "app/renderers", "app/commandManager", "app/eventBus","jquery-layout", "jquery-jsonview" ], function($, renderer, commandManager, eventBus) {

    var showHelp = renderer.showHelp;

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
                        eventBus.emit("vmChanged", vmId);
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
        
        $('#user-commands').on('change', function(){
            eventBus.emit('commandChanged');
        });

        $('#attached-vms').on('change', function(event){
            var vmId = $(event.target).val();
            eventBus.emit('vmChanged', vmId);
        });

        eventBus.on('commandChanged', function(event) {
            var newCommand = renderer.getCommand();
            if (newCommand != "none") {
                commandManager
                    .runCommand(newCommand)
                    .onSuccess(function(data) {
                        renderer.renderMain(data)
                    });
            }
        });

        eventBus.emit("appStarted");
    });
});
