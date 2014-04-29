/*global $, JSPY, Handlebars, convertTrees, setTimeout*/
$(function() {	
	function resetSectionSize(){		
		$('.section').each(function(){
			var section = $(this);
			var sectionHeader = section.find('.section-header');
			var sectionBody = section.find('.section-body');
			sectionBody.height(section.parent().height() - sectionHeader.height());
			sectionBody.width(section.parent().width());
		});		
	}
	
    var fnReference;

    Handlebars.registerHelper( 'recursive', function(children, options) {
        var out = '';

        if (options.fn !== undefined) {
            fnReference = options.fn;
        }
        
        if (children.forEach) {
            children.forEach(function(child){
                out = out + fnReference(child);
            });
        }

        return out;
    });
	
    function refreshTree(url, flowName) {
        $.getJSON( url , function( data ) {
            var i,
				tree = {name:flowName, children: []},
				resultsContainer = $("#result-container");
            for (i in data) {
                tree.children.push( {"threadName":i, children:data[i].children});
            }
            resultsContainer.find('.section-body .section-content').html(template(tree));
			resultsContainer.find('.section-header h5').html(flowName);
            try {
                convertTrees();
            }catch(exception) {
                console.log(exception);
            }
        });
    }
	
	function generateJson(liEle){
		var methodName = liEle.find('>span').text();
		var children = [];
		var childEles = liEle.find('>ul >li');
		if(childEles.length >0){
			childEles.each(function(){
				children.push(generateJson($(this)));
			});
		} else {
			methodName = liEle.text();
		}
		return {
			'methodName' : methodName,
			'children'   : children
		};
	}

    function changeAttachDetach(disableAttach) {
        $('#attach').prop('disabled', disableAttach);
        $('#detach').prop('disabled', !disableAttach);
        showSuccessMessage(disableAttach? "traceStartMsg":"traceEndMsg");
    }

    function showSuccessMessage(divId) {
        $('#'+divId).toggle();
        setTimeout(function(){$('#'+divId).toggle();}, 2000);
    }


    function jsonPost(postData, successCallback, failureCallback) {
        $.ajax({
            beforeSend: function(xhrObj){
                xhrObj.setRequestHeader("Content-Type","application/json");
                xhrObj.setRequestHeader("Accept","application/json");
            },
            type: "POST",
            url: "/debug",
            processData: false,
            data: postData, 
            dataType: "json",
            success: function(json){
                successCallback.call(this, json);
            }
        }).fail(function(jqXHR, textStatus, errorThrown) {
            console.log('problems reaching the server '+textStatus);
            if (failureCallback) {
                failureCallback.call(this, errorThrown);
            }
        });
    }
	

    var source   = $("#tree-template").html();
    var template = Handlebars.compile(source);
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

    $('#attach').click(function(event) {
        var postData; 
        event.preventDefault();
        postData = ['{"action":"start", "port":' ,
						$('#port').val() ,
						', "classNamePattern":"' , 
						$('#classNamePattern').val() , 
					'"}'].join('');
        jsonPost(postData, function(){
            changeAttachDetach(true);
        });
    });

    $('#detach').click(function(event) {
        var postData = '{"action":"stop"}';
        event.preventDefault();
        jsonPost(postData, function(){
            changeAttachDetach(false);
            refreshTree("/tree", "Code Flow");
        });
       
    });

	$.contextMenu({
		selector: '.mktree >li >ul li.liClosed,.mktree >li >ul li.liOpen', 
		build: function($trigger) {
			$trigger.addClass('liHighlight');
			// this callback is executed every time the menu is to be shown
			// its results are destroyed every time the menu is hidden
			// e is the original contextmenu event, containing e.pageX and e.pageY (amongst other data)
			return {
				callback: function(key) {
					if(key == 'sequence'){
						pageLayout.open('east');
						var jsonString = generateJson($trigger);
						JSPY.renderSequence($('#sequence-diagram .section-body .section-content'), jsonString);
					}
				},
				items: {
					"sequence": {name: "Sequence", icon: "sequence"}
				}
			};
		},
		events : {
			"hide" : function(e){
				e.$trigger.removeClass('liHighlight');
			}
		}
	});
	
    refreshTree("/sample.json", "Sample Code Flow");
    $('#port').focus();
	resetSectionSize();
});
