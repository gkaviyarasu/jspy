Any class files location can be passed through the clojure code to get the index and class file blob
which can be copied to this folder.

(instrument-classes (find-classes '("~/SimpleWebApp/src/main/webapp/WEB-INF/classes/")))
which will give ("/tmp/clasdef7044532113880902898blob" "/tmp/index4435751547084722587blob")
where first is the class file and the second index file.


