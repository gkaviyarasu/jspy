define(["jquery", "jquery-jsonview", "app/eventBus"], function($, noMeaning, eventBus){
    var rendererRegistry = {};

    function showHelp(message) {
        var divId = "helpMsg";
        $('#'+divId).html("\t" + message);
        $('#'+divId).toggle();
        setTimeout(function(){$('#'+divId).toggle();}, 2000);
    }

    function renderDefault(selector, data) {
        $(selector).JSONView(data);
    }

    function renderCommands(commands) {
        $('body > .ui-layout-center > .actions').show();
        var selector = $("#user-commands");
        selector.find("option:not(:first)").remove();
        if (commands) {
            commands.forEach(function(command) {
                if (command.editor) {
                    selector.find("option:first").after("<option value='"+command.name + "'>"+command.help+"</option>");
                }
            });
        }
    }

    function renderAttachedVMs(vmIds, selectedVMId) {
        var selector = $("#attached-vms");
        selector.find("option:not(:first)").remove();
        if (vmIds) {
            vmIds.forEach(function(vmId) {
                selector.find("option:first").after("<option value='"+vmId+"'>"+vmId+"</option>");
            });
            if (selectedVMId) {
                setTimeout(function(){selector.val(selectedVMId);}, 300);
            }
        }
    }

    function getCommand() {
        return $('#user-commands').val();
    }

    function selectCommand(optionVal) {
        return $('#user-commands').val(optionVal || 'none');
    }

    function registerRenderer(name, callback) {
        rendererRegistry[name] = callback;
    }

    return {
        "registerRenderer" : registerRenderer,
        renderView: function(data) {
            return this.render("body > .ui-layout-west", data);
        },
        renderMain: function(data) {
            return this.render("body > .ui-layout-center", data);
        },
        render : function(where, data, renderer) {
            renderer = renderer || renderDefault; 
            renderer.call(this, where + " > .data", data);
            var returnVal= {
                addHandler: function(eventName, eventHandler) {
                    $(where + " > .data").on(eventName, eventHandler);
                },
                addAction: function(icon, eventName, toolTip, eventHandler) {
                    
                    $(where + " > .action").on("click", eventHandler);
                }
            };
            eventBus.emit("rendered", {'where':where, 'data':data});
            return returnVal;
        },
        getMainSection: function(selector) {
            return $("body > .ui-layout-center "+selector);
        },
        getLeftViewSection: function(selector) {
            return $("body > .ui-layout-west " + selector);
        },
        renderAttachedVMs: renderAttachedVMs,
        renderCommands : renderCommands,
        getCommand: getCommand,
        setCommand: selectCommand,
        showHelp : showHelp
    };
});
