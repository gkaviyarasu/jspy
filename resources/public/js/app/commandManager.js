define(["app/datasource", "promise", "app/eventBus"], function(ds, Promise, eventBus){
    var currentlyAttaching = false;
    var currentVM = null;
    var commandRegistry = {};

    function CommandResult(promise) {
        return {
            promise : promise,
            onSuccess: function(callBack) {
                this.promise.then(callBack, null);
                return this;
            },
            onFailure: function(callBack) {
                this.promise.then(null, this.callBack);
                return this;
            }
        }
    }

    function runCommand(cmdName, param) {
        // just in case someone changes it once the command start
        var vmId = currentVM;
        var cmd = commandRegistry[cmdName];
        if (cmd) {
            return new CommandResult(cmd.operation.call(this, param, vmId));
        } else {
            throw new Error("Command name " +cmdName+" not recognized");
        }
    }

    function runCommandOnVM(fulfill, reject, command, vmId) {
        ds.forJSON("/vms/command", {'vmId': vmId, 'command':command}, 'POST')
            .then(function(data) {
                ds.forJSON("/vms/response?vmId="+vmId, '','GET', true)
                    .then(function(data) {fulfill(data)}, 
                          function(){
                              reject("command " + command + " on vm "+vmId + "could not be completed successfully")});
            });
        
    }

    function setCurrentVM(vmId) {
        currentVM = '' + vmId;
    }

    function registerCommand(name, operation, helpMsg, internal) {
        commandRegistry[name] = {
            "name" : name,
            "help": helpMsg,
            "operation": function(param, vmId) {
                var promise = new Promise(function(fulfill, reject) {
                    if (operation) {
                        operation.call(this, fulfill, reject, param, vmId);
                    } else {
                        runCommandOnVM(fulfill, reject, name + '()', currentVM);
                    }
                });
                return promise;
            },
            "editor" : (internal)? false:true
        }
        eventBus.emit('commandRegistered', {'name': name});
    }

    registerCommand("attachToVM",
                    function attachToVM(fulfill, reject, vmId) {
                        // interpreting params as vmId
                        if (currentlyAttaching === false) {
                            currentlyAttaching = true;
                            ds.forJSON("/vms/attach", {'vmId': '' + vmId}, 'POST')
                                .then(function(data) {
                                    currentlyAttaching = false;
                                    currentVM = vmId;
                                    fulfill(vmId);
                                }, function() {
                                    currentlyAttaching = false;
                                    reject("attach failed");
                                });
                        } else {
                            reject("In middle of attach");
                        }
                    },
                    "Attach to the VM", true);


    registerCommand("detachFromVM", 
                    function detachFromVM(fulfill, reject, param, vmId) {
                        ds.forJSON("/vms/detach", {'vmId': ''+vmId}, 'POST')
                            .then(function(data){fulfill(data)})
                    },
                    "Detach from the VM");

    registerCommand("listAttachedVMs",
                    function listAttachedVMs(fulfill, reject) {
                        ds.forJSON("/vms/attached")
                            .then(function(data){fulfill(data)});
                    },
                    "List all monitored VMs", true);

    registerCommand("direct", runCommandOnVM, "Run the passed param on VM", true);

    registerCommand("listVMs",
                    function listAttachedVMs(fulfill, reject) {
                        ds.forJSON("/vms")
                            .then(function(data){fulfill(data)});
                    },
                    "List all running vms", true);

    registerCommand("dumpThreads", null, "Show thread dump");
    registerCommand("getClassLocations", null, "Show class locations");
    registerCommand("dumpThreadNames", null, "Show thread names");

    registerCommand("startProfiling",
                    function profileVM(fulfill, reject, classLocations, vmId) {
                        ds.forJSON("/vms/profile", 
                                   {'vmId': ''+vmId, 'locations':classLocations}, 'POST')
                            .then(function(data){
                                fulfill(data);
                            });
                    },
                    "starts profiling the currently selected VM", true);

    registerCommand("stopProfiling",
                    function stopProfiling(fulfill, reject, param, vmId) {
                        ds.forJSON("/vms/unprofile", 
                                   {'vmId': ''+vmId}, 'POST')
                            .then(function(data){
                                fulfill(data);
                            });
                    },
                    "stops profiling the currently selected VM", true);

    registerCommand("getProfiledResults",
                    function(fulfill, reject, param, vmId) {
                        runCommandOnVM(fulfill, reject, "get-all-entries", vmId);
                    },
                    "gets results of the current profiling info", true);

    function getDirectCommandWraper(cmdName) {
        return function(fulfill, reject) {
            runCommandOnVM(fulfill, reject, cmdName + '()', currentVM);
        }
    }

    return {
        "registerCommand" : registerCommand,
        "runCommand":runCommand,
        "setCurrentVM" : setCurrentVM,
        "getCommands" : function() {
            var commands = [];
            var command = null;
            for (var el in commandRegistry) {
                command = commandRegistry[el];
                if (command.internal !== true) {
                    commands.push(command);
                }
            }
            return commands;
        }
    }
});
