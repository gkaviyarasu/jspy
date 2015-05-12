define(["jquery", "app/renderers", "app/commandManager", "app/eventBus","jquery-layout", "jquery-jsonview", "app/profiler", "app/historyManager", "app/lightTrace"], function($, renderer, commandManager, eventBus, profiler, historyManager, lightTrace) {

    var showHelp = renderer.showHelp;
    var keepProfiling = false;

    if (typeof String.prototype.format !== 'function') {
        String.prototype.format = function() {
            var formatted = this, i;
            for (i = 0; i < arguments.length; i++) {
                formatted = formatted.replace("[" + i + "]", arguments[i]);
            }
            return formatted;
        };
    }

    function getHelpDisplayer(msg) {
        return function(){
            showHelp(msg);
        };
    }

    function attachToVM(event) {
        var vmId, errMsg = 'please click on the vm id value';
        try{ 
            vmId = parseInt($(event.target).attr("href"));
            if (vmId) {
                showHelp("Trying to attach to vm, will show active functions on connect");
                commandManager
                    .runCommand("attachToVM", vmId)
                    .onSuccess(function(){
                        updateAttachedVMList(vmId);
                        getHelpDisplayer("Attach completed, running default command after attach");
                        setTimeout(function() { eventBus.emit("vmChanged", vmId);}, 1000);
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

    function transformToReadableVMList(data) {
        var transformed = {'listName':'List of running VMs', 'elements':[]};
        var i = 0;
        for (i ; i < data.length; i++) {
            transformed.elements.push({'href':data[i].id, 'display':'[0] ([1])'.format(data[i].mainClass, data[i].id)});
        }
        return transformed;
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
                        .renderView(transformToReadableVMList(data), "linkListRenderer")
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
