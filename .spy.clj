(defn spy []
  (spy-command/spy-on :host "localhost"
          :port 5005
          :classes "org.apache.cassandra.*"
          :exclude (build-exclude-list exclude-classes))
  (spy-command/start))
