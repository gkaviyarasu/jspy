/*global $*/
$(function() {	
    var retryCounter = 0;
    var selectedVmId = null;

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

    function jsonDataSource(url) {
        return Promise.resolve($.ajax(url));
    }

    function showHelp(message) {
        var divId = "helpMsg";
        $('#'+divId).html("\t" + message);
        $('#'+divId).toggle();
        setTimeout(function(){$('#'+divId).toggle();}, 2000);
    }

    function render(where, what) {
        var dataSource, returnVal;
        if (typeof what === "string") {
            dataSource = jsonDataSource(what)
        } else {
            dataSource = what;
        }

       
        returnVal = {
            using: function(renderer) {
                dataSource.then(function(data) {
                    renderer.call(this, where, data);
                });
                return returnVal;
            },
            on: function(eventName, eventHandler) {
                $(where).on(eventName, eventHandler);
                return returnVal;
            },
            showHelp: function(message) {
                showHelp(message);
                return returnVal;
            }
        }
        return returnVal;

    }

    window.jsonDataSource = jsonDataSource;
    window.render = render;
    window.renderers = {};

    function jsonViewRenderer(selector, data) {
        $(selector).JSONView(data)
   }

    window.renderers["jsonViewRenderer"] = jsonViewRenderer;

    function attachToVM(vmId) {
        var vmId = '' + vmId;
        jsonPost("/vms/attach", {'vmId':vmId}).then(function(data){
            selectedVmId = vmId;
            showHelp("Attached to vm "+vmId+", select one of the commands from drop down");
            $(".attach-notification").html("Attached to "+vmId);
            showPossibleCommands();
            setTimeout(function(){
                runInteractiveCommandOnVm(vmId, "dumpThreads()", "Threads running in the attached vm");
                }, 200);
        });
    }

    function detachFromVM() {
        jsonPost("/vms/detach", {'vmId':selectedVmId}).then(function(data){showHelp("Detached from the VM")});
        $('.possible-commands').hide();
        $(".attach-notification").html("");
    }

    function retryingPost(url, postData, httpVerb, retry, promiseHolder) {
        $.ajax({
            beforeSend: function(xhrObj){
                xhrObj.setRequestHeader("Content-Type","application/json");
                xhrObj.setRequestHeader("Accept","application/json");
            },
            type: httpVerb || "POST",
            url: url,
            processData: false,
            data: JSON.stringify(postData), 
            dataType: "json"
        }).done(function(data){
            promiseHolder.fulfill(data);
        }).fail(function(jqXHR, textStatus, errorThrown) {
            if (retry) {
                retryCounter++;
                if (retryCounter < 4) {
                    setTimeout(retryingPost, 300 * retryCounter, url, postData,httpVerb, true, promiseHolder);
                } else {
                    promiseHolder.reject(errorThrown);
                }
            } else {
                promiseHolder.reject(errorThrown);
            }
        });
    }

    function jsonPost(url, postData, httpVerb, retry) {
        var promise = new Promise(function(fulfill, reject) {
            retryCount = 0;
            retryingPost(url, postData, httpVerb, retry, {"fulfill":fulfill, "reject":reject});
        });
        return promise;
    }

    function runInteractiveCommandOnVm(vmId, command, reultHelp) {
        jsonPost("/vms/command", 
                     {'vmId':vmId, 'command':command}
                ).then(function(data){
                    render("body > .ui-layout-center > .command-display",
                           jsonPost("/vms/response?vmId="+vmId, "", 'GET', true))
                        .using(renderers.jsonViewRenderer)
                        .showHelp(resultHelp);
                         });
    }

    function showPossibleCommands() {
        $('.possible-commands').show();
        $('#user-commands').on('change', runSelectedCommand);
    }

    function runSelectedCommand(event) {
        var commandToRun = $(event.target).val();
        if (commandToRun === 'detachVm') {
            detachFromVM();
        }else{
            if (commandToRun === 'runCustomFunction') {
                commandToRun = $(".command-display").text();
            }
            runInteractiveCommandOnVm(selectedVmId, commandToRun +"()", "Output of selected Command");
        }
    }


    render("body > .ui-layout-west", "/vms").using(renderers.jsonViewRenderer).on('click', function(event) {
        var errMsg = 'please click on the vm id value';
        try{ 
            var vmId = parseInt($(event.target).text()); 
            if (vmId) {
                attachToVM(vmId);
                showHelp("Trying to attach to vm, will show active functions on connect");
            } else {
                showHelp(errMsg);
            }
        }catch(error){
            showHelp(errMsg);
        }
    }).showHelp("Please select the id of the vm you would like to attach to");

    
    window.jsonPost = jsonPost;
    window.runInteractiveCommandOnVm = runInteractiveCommandOnVm;

    // jsonPost("/vms/attach", {'vmId':'5072'}).then(function(data){console.log(data)})
    // jsonPost("/vms/command", {'vmId':'5072', 'command':'dumpThreadNames()'}).then(function(data){console.log(data)})
    // jsonPost("/vms/response?vmId=5072", "", 'GET').then(function(data){console.log(data)})

});
