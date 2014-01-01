$(function() {
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


    var source   = $("#tree-template").html();
    var template = Handlebars.compile(source);
    function refreshTree(url) {
        $.getJSON( url , function( data ) {
            var i;
            var tree = {name:"Sample Code Flow", children: []};
            for (i in data) {
                tree.children.push( {"threadName":i, children:data[i].children})
            }

            $("#result-container").html(template(tree));
            try {
                convertTrees();
            }catch(exception) {
                console.log(exception);
            }
        });
    }

    $('#attach').click(function(event) {
        var postData; 
        event.preventDefault();
        postData = '{"action":"start", "port":' + $('#port').val() + '}';
        jsonPost(postData, function(){
            $('#attach').prop('disabled', true);
            $('#detach').prop('disabled', false);
        });
    });

    $('#detach').click(function(event) {
        var postData = '{"action":"stop"}';
        event.preventDefault();
        jsonPost(postData, function(){
            $('#attach').prop('disabled', false);
            $('#detach').prop('disabled', true);
            refreshTree("/tree");
        });
       
    });

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
    refreshTree("/sample.json");
});
