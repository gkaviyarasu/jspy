# spy

A simple java trace utility

## Requirements

1. JDK 1.6 or above

## Usage

1. mvn verify , it will start jspy at port 8585
1. open http://localhost:8585, it will show all the currently running VMs on left panel.
1. Click on any vmid, it will do an automatic attach and show classloader information
1. To trace all classes in a jar, select "show class locations", choose the jar or folder with the classes and click "Start Profiling"
1. Under the "Start Profiling" button, we can now see a tree structure with running methods
1. we can attach to multiple vms or quickly switch between vms and other fun stuff 

## Devmvn
1. cd jspy-core  
1. mvn clojure:repl  
1. (use 'com.imaginea.jspy.spy)  
1. (def server (start-server))  
1. connect to http://localhost:8585 (in case of port conflicts use jetty.port system property)

## License
    
    The Apache Software License, Version 2.0, http://www.apache.org/licenses/LICENSE-2.0.txt
    

## Under the hood
Depends on java profiling interface and embedded javascript engine to give maximum support for interactive profiling.

## Troubleshooting  
1. If http port 8585 is already bound to some other process, use jetty.port system property  
1. If JAVA_HOME is not set, edit tools-home in project.clj
1. agent.path and base.commands.path are two other system properties which are used in profiling. agent.path points to the jar location built from the src in jspy-profiler, base.commands.path points to the folder location for the basic commands to get more information from the vm, default location is jspy-core/src/main/resources/commands/ (we need the trailing slash)

## Fun Commands
curl 'http://localhost:8585/vms'  
curl 'http://localhost:8585/vms/attach' -H 'Accept: application/json' -H 'Content-Type: application/json' --data-binary '{"vmId":"21506"}' --compressed -X POST  
curl 'http://localhost:8585/vms/command' -H 'Accept: application/json' -H 'Content-Type: application/json' --data-binary '{"vmId":"23608", "command":"dumpThreadNames()"}' --compressed -X POST  
curl 'http://localhost:8585/vms/response' -H 'Accept: application/json' -H 'Content-Type: application/json' --data-binary '{"vmId":"23608"}' --compressed -X GET
curl 'http://localhost:8585/vms/detach' -H 'Accept: application/json' -H 'Content-Type: application/json' --data-binary '{"vmId":"23608"}' --compressed -X GET -X POST 


## save the profiler stack
in case you like the stack and need the dump of it, run these commands
on your browser dev-tool, creates a save function in console, dumps
all data from stack as json string, saves that to file console.json
(function(console){

    console.save = function(data, filename){

        if(!data) {
            console.error('Console.save: No data')
            return;
        }

        if(!filename) filename = 'console.json'

        if(typeof data === "object"){
            data = JSON.stringify(data, undefined, 4)
        }

        var blob = new Blob([data], {type: 'text/json'}),
            e    = document.createEvent('MouseEvents'),
            a    = document.createElement('a')

        a.download = filename
        a.href = window.URL.createObjectURL(blob)
        a.dataset.downloadurl =  ['text/json', a.download, a.href].join(':')
        e.initMouseEvent('click', true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null)
        a.dispatchEvent(e)
    }
    })(console)
    
var bigStr = JSON.stringify( d3.select("svg").selectAll("g.node").data(), function( key, value) {
  if( key == 'parent') { return value.id;}
  else {return value;}
  }, ' ')

console.save(bigStr)
