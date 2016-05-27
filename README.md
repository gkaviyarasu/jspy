# spy

A simple java trace utility

## Requirements

1. Lein 1 or 2 
2. JDK 1.6 or above

## Usage

- Checkout into a directory (say *spy*)
- Build the agent, cd profiler/agent && mvn package
- Start repl (in the shell): `spy$ bin/lein repl` or `lein repl`
- Server is started on port 8585, connect to http://localhost:8585
- It shows all the currently running VMs on left panel.
- Click on any vmid, it will do an automatic attach and show classloader information
- To trace all classes in a jar, select "show class locations", choose the jar or folder with the classes and click "Start Profiling"
- Under the "Start Profiling" button, we can now see a tree structure with running methods
- we can attach to multiple vms or quickly switch between vms and other fun stuff

## License
    
    Distributed under the Eclipse Public License, the same as Clojure.

## Under the hood
Depends on java profiling interface and embedded javascript engine to give maximum support for selective profiling.

## Troubleshooting  
1. If http port 8585 is already bound to some other process, change the port in spy.clj at the last line  
1. If JAVA_HOME is not set, edit tools-home in project.clj 

## Fun Commands
curl 'http://localhost:8585/vms'  
curl 'http://localhost:8585/vms/attach' -H 'Accept: application/json' -H 'Content-Type: application/json' --data-binary '{"vmId":"21506"}' --compressed -X POST  
curl 'http://localhost:8585/vms/command' -H 'Accept: application/json' -H 'Content-Type: application/json' --data-binary '{"vmId":"23608", "command":"dumpThreadNames()"}' --compressed -X POST  
curl 'http://localhost:8585/vms/response' -H 'Accept: application/json' -H 'Content-Type: application/json' --data-binary '{"vmId":"23608"}' --compressed -X GET
curl 'http://localhost:8585/vms/detach' -H 'Accept: application/json' -H 'Content-Type: application/json' --data-binary '{"vmId":"23608"}' --compressed -X GET -X POST 
