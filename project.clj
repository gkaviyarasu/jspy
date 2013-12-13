(def tools-home [(format "%s/lib/tools.jar" (System/getenv "JAVA_HOME"))])

(defproject spy "1.0.0-SNAPSHOT"
  :description "Simple trace utility for java programs, refer to README.md for details"
  :dependencies [[org.clojure/clojure "1.5.1"]
                 [ring/ring-jetty-adapter "1.2.0"]
                 [ring/ring-json "0.2.0"]
                 [compojure "1.1.6"]
                 [clj-json "0.5.3"]]
  :dev-dependencies [[lein-run "1.0.0-SNAPSHOT"]]
  :repl-init spy
  :jvm-opts ["-Xss5m"
             ;; "-Xdebug"
             ;; "-Xrunjdwp:transport=dt_socket,server=y,suspend=n,address=5005"
             ]
  :java-source-path "test-java"
  :extra-classpath-dirs ~tools-home)
