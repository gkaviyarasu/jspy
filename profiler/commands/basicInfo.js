importPackage(java.lang.reflect);

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
    return JSON.stringify(sFrames);
}

function getClassLoaders() {
    var cls={}; 
    var threads = Thread.getAllStackTraces().keySet();  
    var it = threads.iterator(); 
    while(it.hasNext()) { 
        var t = it.next(); 
        var cl = t.getContextClassLoader(); 
        if (cl && !(cls[cl.hashCode()])) {
            cls[cl.hashCode()] = cl;
        }
 e   } 
    return cls;
}

function dumpThreadNames(){ 
    var tNames = []; 
    threads = Thread.getAllStackTraces().keySet(); 
    it = threads.iterator(); 
    while(it.hasNext()) { 
        t = it.next(); 
        tNames.push('' + t.getName())
    }
    return JSON.stringify(tNames);
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
        return JSON.stringify({'result':'failure', 'detail':'' + error.toString()});
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
    return JSON.stringify(cls);
}

function dumpThreads() {
    var allFrames = {};
    threadDumps = Thread.getAllStackTraces(); 
    threads = threadDumps.keySet(); it = threads.iterator(); 
    while(it.hasNext()) { 
        var sFrames = [];
        t = it.next(); 
        stacks = threadDumps.get(t); 
        for (i = 0; i < stacks.length; i++){
            sFrames.push('' + stacks[i].toString());
        }
        allFrames[t.getName()] = sFrames;
    }
    return JSON.stringify(allFrames);
}


function toStr(arlr) { 
    var strArr = []; 
    var i = 0; 
    for (; i < arr.length; i++){ 
        strArr.push(arr[i].toString())
    } 
    return strArr;
} 

function getMethod(clsName, methodName) {
    var cls = Class.forName(clsName);
    var methods = cls.getDeclaredMethods();
    var i = 0;
    for(; i < methods.length; i++) {
        if (methodName.equals(methods[i].getName())) {
            return methods[i];
        }
    }
    return null;
}

function invokeVoidViaReflection(obj, clsName, methodName) {
    var m = getMethod(clsName, methodName);
    m.setAccessible(true);
    return m.invoke(obj, null);
}
