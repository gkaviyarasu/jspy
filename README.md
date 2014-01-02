# spy

A simple java trace utility

## Requirements

1. Lein 1 (didn't move to lein 2 yet)
2. JDK 1.6

## Usage

- Checkout into a directory (say *spy*)
- Start repl (in the shell): `spy$ bin/lein repl`

    This is assuming remote debug session is already started with jvm args `-Xdebug -Xrunjdwp:transport=dt_socket,server=y,suspend=n,address=<port-number>`
    
- Server is started on port 8585, connect to http://localhost:8585
- Fill in the port number and click on attach
- To see the trace click on detach
- Exit with `Ctrl-C`

## License
    
    Copyright (C) 2011 BMLs
    Distributed under the Eclipse Public License, the same as Clojure.

## Under the hood
Depends on java debug, captures all the method entry and exit events and creates a tree out of it.

## Troubleshooting  
1. If http port 8585 is already bound to some other process, change the port in spy.clj at the last line  
1. If JAVA_HOME is not set, edit tools-home in project.clj 
