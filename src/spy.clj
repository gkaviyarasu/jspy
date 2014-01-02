(ns spy
  (:use [compojure.core]
        [ring.middleware.json]
        [ring.util.response]
        [ring.adapter.jetty]
        [spy-command]
        )
  (:require [clj-json.core :as json]
            [compojure.route :as route])

)

(def current-trace (atom {:data nil}))

(defn build-exclude-list [excludes]
  (set (reduce concat
               (map (fn [[p cs]]
                      (map (fn [c] (str p "." c))
                           cs))
                    excludes))))

(def exclude-classes
  [["java.lang.reflect" ["*"]]
   ["org.apache.cassandra.serializer" ["AbstractTextSerializer" "TextSerializer"]]])


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

(defn set-current-trace [data]
  (swap! current-trace conj {:data data})
  (print "done")
)

(defroutes handler 
  (GET "/" [] (json-response {"hello" "world"}))
  (PUT "/name" [name] (json-response {"hello" name}))
  (POST "/debug" [action port classNamePattern] 
        (json-response {"response" (if (= action "start" )
           (do (spy-command/spy-on 
                :host "localhost"
                :port port
                :classes classNamePattern
                :exclude (build-exclude-list exclude-classes))
               (spy-command/start) "started")
           (do (spy-command/stop) 
               (set-current-trace (thread-grouped-method-tree (data)))"stopped"))
         }))
  (GET "/tree" [] {:status 200 :headers {"Content-Type" "application/json"} :body (create-json (:data @current-trace) #{})})
  (route/resources "/")
)


(def app
  (-> handler
    wrap-json-params))

(defonce server (run-jetty #'app {:port 8585 :join? false}))
