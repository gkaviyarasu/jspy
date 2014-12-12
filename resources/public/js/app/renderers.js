define(["jquery", "jquery-jsonview", "app/eventBus"], function($, noMeaning, eventBus){
    function showHelp(message) {
        var divId = "helpMsg";
        $('#'+divId).html("\t" + message);
        $('#'+divId).toggle();
        setTimeout(function(){$('#'+divId).toggle();}, 2000);
    }

    function renderJSON(selector, data) {
        $(selector).JSONView(data);
    }

    function renderCommands(commands) {
        $('.possible-commands').show();
        var selector = $("#user-commands");
        selector.find("option:not(:first)").remove();
        if (commands) {
            commands.forEach(function(command) {
                selector.find("option:first").after("<option value='"+command.name + "'>"+command.help+"</option>");
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

    return {
        renderView: function(data) {
            return this.render("body > .ui-layout-west", data);
        },
        renderMain: function(data) {
            return this.render("body > .ui-layout-center > .command-display", data);
        },
        render : function(where, data) {
            renderJSON(where, data);
            var returnVal= {
                addHandler: function(eventName, eventHandler) {
                    $(where).on(eventName, eventHandler);
                }
            };
            eventBus.emit("rendered", {'where':where, 'data':data});
            return returnVal;
        },
        renderAttachedVMs: renderAttachedVMs,
        renderCommands : renderCommands,
        getCommand: getCommand,
        setCommand: selectCommand,
        showHelp : showHelp
    };
});
