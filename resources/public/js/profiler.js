/*global $*/
$(function() {	
    var retryCounter = 0;
    var selectedVmId = null;
    var lastRanCommand = "";
    var lastSelectedVmId = null;
    var currentlyAttaching = false;
    var globalEventHandlers = {};

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
        var promise = Promise.resolve($.ajax(url));
        promise.toString = function(){return url;}
        return promise;
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
                    window.dispatchEvent(new CustomEvent('rendered', {'detail': dataSource} ));
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

    function showProfiledVms() {
        jsonDataSource("/vms/attached").then(
            function(data){
                var selector = $("#attached-vms");
                if (data) {
                    selector.find("option:not(:first)").remove()
                    data.forEach(function(vmId) {
                        selector.find("option:first").after("<option value='"+vmId+"'>"+vmId+"</option>")
                    });
                }
                // we can not select an option in the same function where the option is added.
                setTimeout(function(){selector.val(selectedVmId);}, 300);
            });
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
        if (currentlyAttaching === false) {
            jsonPost("/vms/attach", {'vmId':vmId}).then(
                function(data){
                    currentlyAttaching = false;
                    selectedVmId = vmId;
                    showHelp("Attached to vm "+vmId+", select one of the commands from drop down");
                    showProfiledVms(vmId);
                    showPossibleCommands();
                    setTimeout(function(){
                        runInteractiveCommandOnVm(vmId, "dumpThreads()", "Threads running in the attached vm");
                        setUserCommand('dumpThreads');
                    }, 200);
                }, function() {
                    currentlyAttaching = false;
                    showHelp("Failed to attach to "+vmId + ", most probably the vm is not active anymore, please refresh the vm list and try again");
                });
        } else {
            showHelp("In the middle of attach to "+vmId);
        }
    }

    function detachFromVM() {
        jsonPost("/vms/detach", {'vmId':selectedVmId}).then(
            function(data){
                showHelp("Detached from the VM");
                $('.possible-commands').hide();
                selectedVmId = null;
                showProfiledVms();
                setUserCommand();
            });
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
            retryCounter = 0;
            retryingPost(url, postData, httpVerb, retry, {"fulfill":fulfill, "reject":reject});
        });
        return promise;
    }

    function runInteractiveCommandOnVm(vmId, command, resultHelp) {
        showHelp("Getting data for "+resultHelp)
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
    }

    function runSelectedCommand(event) {
        var commandToRun = $(event.target).val();
        if ((commandToRun !== lastRanCommand) && (commandToRun !== 'none')) {
            if (commandToRun === 'detachVm') {
                detachFromVM();
            } else if (commandToRun === 'startProfiling') {
                if (startProfiling() === false) {
                    return;
                }
            } else if (commandToRun === 'stopProfiling') {
                stopProfiling();
            }else {
                if (commandToRun === 'runCustomFunction') {
                    commandToRun = $(".command-display").text();
                }
                runInteractiveCommandOnVm(selectedVmId, commandToRun +"()", "Output of selected Command");
            }
        }
        lastRanCommand = commandToRun;
    }

    function switchToAttachedVM() {
        var selectedVM = $(event.target).val();
        if (selectedVM != lastSelectedVmId) {
            selectedVmId = selectedVM;
            showPossibleCommands();
            setUserCommand();
        }
    }

    function setUserCommand(optionVal) {
        $('#user-commands').val(optionVal || 'none');
    }

    $('#attached-vms').on('change', switchToAttachedVM);
    $('#user-commands').on('change', runSelectedCommand);


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

    function startProfiling() {
        var classLocations = [];
        $(".ui-layout-center .level1 li input:checkbox:checked").each(function(){classLocations.push($(this).next('span').text().replace(/"/g,''));});
        if (classLocations.length > 0) {
            console.log(classLocations);
            return true;
        } else {
            showHelp("Select class locations and then start profiling");
            return false;
        }
    }

    function stopProfiling() {
    }

    showProfiledVms();
    window.addEventListener('rendered', function(event){
        $(".ui-layout-center .level1 li span").before(function(){return "<input type='checkbox' class='node-selector'></input>";});
    });

    window.jsonPost = jsonPost;
    window.runInteractiveCommandOnVm = runInteractiveCommandOnVm;

    // jsonPost("/vms/attach", {'vmId':'5072'}).then(function(data){console.log(data)})
    // jsonPost("/vms/command", {'vmId':'5072', 'command':'dumpThreadNames()'}).then(function(data){console.log(data)})
    // jsonPost("/vms/response?vmId=5072", "", 'GET').then(function(data){console.log(data)})

});
