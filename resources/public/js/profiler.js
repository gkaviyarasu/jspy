/*global $*/
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
});
