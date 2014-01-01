(ns spy-web
  (:use [compojure.core]
        [ring.middleware.json]
        [ring.util.response])
  (:require [clj-json.core :as json]
            [compojure.route :as route])

)

(def current-trace (atom {:data nil}))

(defn json-response [data & [status]]
  {:status (or status 200)
   :headers {"Content-Type" "application/json"}
   :body (json/generate-string data)})

(defn create-json [few-method-tree visited-nodes]
  (defn extract-relevant-part [x]
    {:id (:id x) :type "entry" :methodName (str (:method x)) :children  (map extract-relevant-part (:children x))})
  (binding [clj-json.core/*coercions* 
            {nodes.MethodEntryNode extract-relevant-part,
            nodes.MethodExitNode (fn[x] {:id (:id x) :type "exit"})}
            ]
    (json/generate-string few-method-tree)))

(defroutes handler 
  (GET "/" [] (json-response {"hello" "world"}))
  (PUT "/name" [name] (json-response {"hello" name}))
  (POST "/debug" [action port] (json-response {"hello" action}))
  (GET "/tree" [] {:status 200 :headers {"Content-Type" "application/json"} :body (create-json (:data @current-trace) #{})})
  (route/resources "/")
)

(defn set-current-trace [data]
  (swap! current-trace conj {:data data})
  (print "done")
)

(def app
  (-> handler
    wrap-json-params))

