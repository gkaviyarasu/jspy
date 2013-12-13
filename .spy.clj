(defn build-exclude-list [excludes]
  (set (reduce concat
               (map (fn [[p cs]]
                      (map (fn [c] (str p "." c))
                           cs))
                    excludes))))

(def exclude-classes
  [["java.lang.reflect" ["*"]]
   ["org.apache.cassandra.serializer" ["AbstractTextSerializer" "TextSerializer"]]])

(defn spy []
  (spy-on :host "localhost"
          :port 5005
          :classes "org.apache.cassandra.*"
          :exclude (build-exclude-list exclude-classes))
  (spy/start))
