define(["jquery", "jquery-jsonview", "app/eventBus"], function($, noMeaning, eventBus){
    var rendererRegistry = {};
    var array = [];

    function showHelp(message) {
        var divId = "helpMsg";
        $('#'+divId).html("\t" + message);
        $('#'+divId).toggle();
        setTimeout(function(){$('#'+divId).toggle();}, 2000);
    }

    function renderDefault(selector, data) {
        $(selector).JSONView((data.response)? data.response:data);
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

    function linkListRenderer(location, data) {
        var rootElement = $(location);
        var i, element;
        rootElement.append('<div class="header" style="padding:10px"><h4>[0]</h4></div>'.format(data.listName));
        for (i = 0; i < data.elements.length; i++) {
            element = data.elements[i];
            rootElement.append('<a href="[0]" style="padding:10px;position: absolute;width: 100%;">[1]</a><br/><br/>'.format(element.href, element.display));
        }
            
    }

  
    rendererRegistry["linkListRenderer"] = linkListRenderer;

        /**
     * [match pattern and insert a flag '@']
     * @param  {[array]} items [pattern array]
     * @param  {[array]} arr   [all path array]
     * @return {[array]}       [return all path with flag included]
     */
    function checkItem(items, arr){
        var tempArr = [];
        arr.forEach(function(path){
            var str = path.split('/');
            var strLast = str[str.length-1];
            if(strLast){
               path = path.replace(strLast, '@'+strLast); 
            }
            for(var i = items.length; i > 0; i--){
                var val = path.indexOf(items[i-1]);
                if(val >= 0 ){
                    path = path.replace(items[i-1] + '/', items[i-1] + '/@' );
                }
            }
            tempArr.push(path);
        })
       return tempArr;
    }

    var hierarchy;
    var expand = false;
    /**
     * [make nested ul li element recursively]
     * @param  {[object]} hierarchy [take each and every nested object]
     * @param  {[string]} classname [main class name of tree]
     * @return {[string]}           [string of nested ul li]
     */
    var makeUlList = function(hierarchy, classname){
        var dirs = Object.keys(hierarchy);
        var ul = '<ul';
        if(classname){
            ul += ' class="' + classname + '"';
        }
        ul += '>\n';
        dirs.forEach(function(dir){
            var path = hierarchy[dir].path;
            if(path){ // file
                ul += '<li class="file"><a><input type="checkbox" value="'+ path.replace(/@/g, '') +'"/> ' + dir.replace(/\/$/, '')+ '</a></li>\n';
            }else{  // dir
                    ul += '<li class="folder"><a> ' + dir.replace(/\/$/, '') + '</a>\n';
                    ul += makeUlList(hierarchy[dir]);
                    ul += '</li>\n';
                
            }
        });        
        ul += '</ul>\n';
        return ul;
    }

    return {
        "registerRenderer" : registerRenderer,
        renderView: function(data, rendererName) {
            return this.render("body > .ui-layout-west", data, rendererName);
        },
        renderMain: function(data, rendererName) {
            return this.render("body > .ui-layout-center", data, rendererName);
        },
        render : function(where, data, rendererName) {
            var renderer = rendererRegistry[rendererName] || renderDefault; 
             if(getCommand() !== "getClassLocations") {
                renderer.call(this, where + " > .data", data);
            }
            else{
                this.getMainSection(".tree").append("<div id='all' style='padding: 9px;'><button class='btn btn-success btn-xs'>expand all</button></div>");
                $.each(data.response, function(key, value) {
                    array = data.response[key];
                    var matchedArr = [];
                    var y = '';
                    var z;
                    array.reduce(function(hier,path){
                        var x = hier;
                        path.split('/').forEach(function(item){
                                if(item){
                                    if(!x[item]){
                                        x[item] = {};
                                    }
                                    else{
                                        y = y + '/' + item;
                                        z = y.slice(1);
                                    }
                                    x = x[item];
                                }
                        });
                        if(z){
                            matchedArr.push(z);
                        }                        
                        y = '';
                        return hier;
                    }, {});

                    /*sort element in array*/
                    matchedArr.sort().reduce(function(a, b){ if (b != a[0]) a.unshift(b); return a }, []);
                    /*remove duplicate from array*/
                    matchedArr = matchedArr.filter(function(item, i, self){
                      return self.lastIndexOf(item) == i;
                    });
                    var newArr = checkItem(matchedArr, array);
                    
                    var hierarchy = newArr.reduce(function(hier,path){
                        var x = hier;
                        path.split('@').forEach(function(item){
                                if(item){
                                    if(!x[item]){
                                        x[item] = {};
                                    }
                                    x = x[item];
                                }
                        });
                        x.path = path;
                        return hier;
                    }, {});

                    var list = makeUlList(hierarchy, 'pathTree');
                    
                    $("body > .ui-layout-center > .data").empty();
                    $("body > .ui-layout-center .tree").append('<h5 style="margin:25px;">'+key+':</h4>');
                    $("body > .ui-layout-center .tree").append(list);
                });

                $( '.tree li.folder' ).each( function() {
                    if( $( this ).children( 'ul' ).length > 0 ) {
                        $( this ).addClass( 'parent' );    
                    }
                });

                $( '.tree li.parent > a' ).click( function(e) {
                    $( this ).parent().toggleClass( 'active' );
                    $( this ).parent().children( 'ul' ).slideToggle( 'fast' );
                });

                $( '#all button' ).click( function() {
                    if(!expand){
                        $('#all button').html('collapse all');
                        expand = true;
                    }
                    else{
                        $('#all button').html('expand all');
                        expand = false; 
                    }
                    $( '.tree li' ).each( function() {
                        $( this ).toggleClass( 'active' );
                        $( this ).children( 'ul' ).slideToggle( 'fast' );
                    });
                });
            }

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
