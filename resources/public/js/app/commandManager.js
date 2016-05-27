define(["app/datasource", "promise", "app/eventBus", "app/transformer"], function(ds, Promise, eventBus, transformer){
    var currentlyAttaching = false;
    var currentVM = null;
    var commandRegistry = {};

    function CommandResult(cmdName, param, promise) {
        return {
            cmdName : cmdName,
            param : param || "",
            promise : promise,
            onSuccess: function(callBack) {
                var self = this;
                this.promise.then(function(data) {
                    
                    self.data = transformer.transform(cmdName, data);
                    eventBus.emit("commandCompleted", self);
                    callBack(data)
                }, null);
                return this;
            },
            onFailure: function(callBack) {
                this.promise.then(null, this.callBack);
                return this;
            },
            toString: function() {
                return cmdName + " [" + param + "] at " +Date.now();
            }
        };
    }

    function runCommand(cmdName, param) {
        // just in case someone changes it once the command start
        var vmId = currentVM;
        var cmd = commandRegistry[cmdName];
        if (cmd) {
            return new CommandResult(cmdName, param, cmd.operation.call(this, param, vmId));
        } else {
            throw new Error("Command name " +cmdName+" not recognized");
        }
    }

    function runCommandOnVM(fulfill, reject, command, vmId, responseUrl) {
        responseUrl = responseUrl || "/vms/response";
        ds.forJSON("/vms/command", {'vmId': vmId, 'command':command}, 'POST')
            .then(function(data) {
                ds.forJSON(responseUrl + "?vmId="+vmId, null,'GET', true)
                    .then(function(data) {fulfill(data);}, 
                          function(){
                              reject("command " + command + " on vm "+vmId + "could not be completed successfully");});
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
        };
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
                            .then(function(data){fulfill(data);});
                    },
                    "Detach from the VM");

    registerCommand("listAttachedVMs",
                    function listAttachedVMs(fulfill, reject) {
                        ds.forJSON("/vms/attached")
                            .then(function(data){fulfill(data);});
                    },
                    "List all monitored VMs", true);

    registerCommand("direct", runCommandOnVM, "Run the passed param on VM", true);

    registerCommand("listVMs",
                    function listAttachedVMs(fulfill, reject) {
                        ds.forJSON("/vms")
                            .then(function(data){fulfill(data);});
                    },
                    "List all running vms", true);

    registerCommand("dumpThreads", null, "Show thread dump");
    registerCommand("getClassLocations", null, "Show class locations");
    registerCommand("dumpThreadNames", null, "Show thread names");


    function getDirectCommandWraper(cmdName) {
        return function(fulfill, reject) {
            runCommandOnVM(fulfill, reject, cmdName + '()', currentVM);
        };
    }

    return {
        "registerCommand" : registerCommand,
        "runCommand":runCommand,
        "setCurrentVM" : setCurrentVM,
        "runCommandOnVM" : runCommandOnVM,
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
    };
});
