(ns nodes)

(defprotocol HasType (node-type [node]))

(defrecord ArgumentNode [name type value])

(defrecord MethodEntryNode [id method thread class args]
  HasType (node-type [node] :entry))

(defrecord MethodExitNode [id method thread class return-type return]
  HasType (node-type [node] :exit))

(defrecord ThrowExceptionNode [id thread message stack]
  HasType (node-type [node] :throw))

(defrecord CatchExceptionNode [id thread stack]
  HasType (node-type [node] :catch))

