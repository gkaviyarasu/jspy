# Repl

Every once in a while VM does something funny and we need a peek inside. Profiling agents till now are very opaque, they do not let the user look at anything beyond what the profiler hard coded for. Repl breaks out of this constraint. Since we leverage the javascript engine baked into every oracle VM and our agent opens up a communication channel with it, we can run whatever we want in js to query our application state. For an example of such functions take a look at profiler/commands/basicInfo.js, we get the thread dump, class locations and other fun stuff.

Of course, getClassLocations makes assumptions that all classLoaders have a getURLS method which is not true. With a conventional profiler this would have been the end of the story. We can get information about most but not this classloader. With JSPY repl it does not need to be so, we can attach to the vm, run our modified js command and look at the output, if we like it, we can then change it in the source too or define our custom command which will be used by the UI rather than the one baked into jspy.


## Common commands

1. Get the profiler associated with the vm
(get-profiler vmId)

1. Run a command on VM
(run-command-on-vm <vmId> <String command>) e.g (run-command-on-vm "23256" "dumpThreadNames()")

1. Check results for the command
(get-result-from-vm <vmId>) e.g (get-result-from-vm "23256")

var cl = getClassLoaders()

1. Run a new js file
(run-command-on-vm "23256" (slurp "./newFeatures.js"))
