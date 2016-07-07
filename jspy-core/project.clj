(def tools-home [(format "%s/lib/tools.jar" (System/getenv "JAVA_HOME"))])

(def lein2hack ["resources" (first tools-home)])

;; defproject has hacks to make it work for both lein1 and 2
;; so it ends up setting extra-classpath-dirs and resource-paths, main and repl-init

(defproject spy "1.0.0-SNAPSHOT"
  :description "Simple trace utility for java programs, refer to README.md for details"
  :dependencies [[org.clojure/clojure "1.8.0"]
                 [ring/ring-jetty-adapter "1.6.0-beta1"]
                 [ring/ring-json "0.4.0"]
                 [compojure "1.5.1"]
                 [clj-json "0.5.3"]]
  :dev-dependencies [[lein-run "1.0.0-SNAPSHOT"]]
  :repl-init spy
  :main spy
  :jvm-opts ["-Xss5m"
             ;; "-Xdebug"
             ;; "-Xrunjdwp:transport=dt_socket,server=y,suspend=n,address=5005"
             ]
  :extra-classpath-dirs ~tools-home
  :resource-paths    ~lein2hack )
