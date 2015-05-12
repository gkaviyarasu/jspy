# Trace Diff

Lightweight feel of vm activity. Profiling or tracking is heavy, on the other hand most of the times our needs are just limited to understanding what the VM is upto. A thread dump has too much details as it captures all the stacks, on the other hand, we are interested only in deltas between thread dumps. For example in a running jetty server, only one of the request handling threads matter, the rest are just blocked waiting for more requests to drop in.

## Usage

- Attach to VM
- Switch to LightTrace

## Under the hood
Generates repeated thread dumps and a diff viewer which organizes threads in the order of last changed stack.

## Fun Commands
curl 'http://localhost:8585/vms'  
curl 'http://localhost:8585/vms/attach' -H 'Accept: application/json' -H 'Content-Type: application/json' --data-binary '{"vmId":"21506"}' --compressed -X POST  
curl 'http://localhost:8585/vms/command' -H 'Accept: application/json' -H 'Content-Type: application/json' --data-binary '{"vmId":"23608", "command":"dumpThreads()"}' --compressed -X POST  
curl 'http://localhost:8585/vms/response' -H 'Accept: application/json' -H 'Content-Type: application/json' --data-binary '{"vmId":"23608"}' --compressed -X GET
curl 'http://localhost:8585/vms/detach' -H 'Accept: application/json' -H 'Content-Type: application/json' --data-binary '{"vmId":"23608"}' --compressed -X GET -X POST 
