# UI Design
Use require to split into modules, each module is responsible for one functionality. Main components are renderers, eventBus, commandManager. Commands are registered with command manager, each command emits a event and uses datasource to interact with the backend. The other components piggyback on events to provide ui customizations or add more commands. For example all fucntionality related to profiling is contained in profiler.js.

profiler.js registers a tree viewer to show code traces. It registers commands specific to profiling, start, stop and gerProfiledResults. It customizes the view to render class location commands to add additional functionality (checkboxes) and button for starting profiling.

