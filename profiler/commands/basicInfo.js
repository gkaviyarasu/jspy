function dumpThread(name) {
    var sFrames = [];
    threadDumps = Thread.getAllStackTraces(); 
    threads = threadDumps.keySet(); it = threads.iterator(); 
    while(it.hasNext()) { 
        t = it.next(); 
        if (t.getName().equals(name)) { 
            stacks = threadDumps.get(t); 
            for (i = 0; i < stacks.length; i++){
                sFrames.push('' + stacks[i].toString());
            }
        }
    }
    print(JSON.stringify(sFrames))
}


function dumpThreadNames(){ 
    var tNames = []; 
    threads = Thread.getAllStackTraces().keySet(); 
    it = threads.iterator(); 
    while(it.hasNext()) { 
        t = it.next(); 
        tNames.push('' + t.getName())
    }
    print(JSON.stringify(tNames))
}

function getThread(name) {
    var threads = Thread.getAllStackTraces().keySet(); 
    var it = threads.iterator(); 
    while(it.hasNext()) { 
        var t = it.next(); 
        if (t.getName().equals(name)) { 
            return  t;
        }
    }
}


function bp(f) { 
    try{
        return f.call(this);
    }catch(error) {
        print(JSON.stringify({'result':'failure', 'detail':'' + error.toString()}));
    }
}


function getClassLocations() {
    var cls = {};
    var threads = Thread.getAllStackTraces().keySet(); 
    var it = threads.iterator(); 
    while(it.hasNext()) { 
        var t = it.next();
        var cl = t.getContextClassLoader();
        var urlPaths;
        if (cl && !(cls[cl.hashCode()])) {
            urlPaths = bp(function(){ var x = []; var y = cl.getURLs(); for (i = 0; i < y.length; i++){x.push('' + y[i].toString());}return x;});
            if (urlPaths) {
                cls[cl.hashCode()] = urlPaths;
            }
        }
    }
    print (JSON.stringify(cls));
}

