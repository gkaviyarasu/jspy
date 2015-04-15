define(["d3"], function(d3) {
    var sampleData;

    var margin = {top: 30, right: 20, bottom: 30, left: 20},
        width = 960 - margin.left - margin.right,
        barHeight = 20,
        barWidth = width * 0.8;

    var i = 0,
        duration = 400,
        root;

    var tree = d3.layout.tree()
        .nodeSize([0, 20]);

    var line = d3.svg.line()
        .x(function (d) {
            return d.x;
        })
        .y(function (d) {
            return d.y;
        })
        .interpolate("step-before");

    function plot(selector, dataSet) {
        var plotData, svg;
        //reset whatever was present
        $(selector).html("");

        plotData = dataSet;
        svg = d3.select(selector).append("svg")
            .attr("width", width + margin.left + margin.right)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        plotData.x0 = 0;
        plotData.y0 = 0;
        root = plotData;
        // collapse all nodes
        tree.nodes(root).forEach(function(node){toggle(node);});
        //expand root
        toggle(root);
        update(root);

        function getDisplayName(name) {
            try {
                var nameList = name.split("(");
                var methodName = nameList[0];
                var expression = ".";
                var firstPoint = methodName.lastIndexOf(expression);
                var secondPoint = methodName.lastIndexOf(expression, firstPoint - 1);
                var packageName = methodName.substring(0, secondPoint);
                var exp = new RegExp("[a-zA-z0-9\$]*\.", "g");
                var pkgAbbr = packageName.match(exp).map(function (str) {
                    return str.charAt(0) + ".";
                }).join("");
                return pkgAbbr + methodName.substring(secondPoint + 1) + "(" + nameList[1];
            }catch(e) {
                // in case of parsing errors, just use the name
                return name;
            }
        }

        function update(source) {

            var nodes = tree.nodes(root);
            var height = Math.max(500, nodes.length * barHeight + margin.top + margin.bottom);

            d3.select("svg").transition()
                .duration(duration)
                .attr("height", height);

            d3.select(self.frameElement).transition()
                .duration(duration)
                .style("height", height + "px");

            // Compute the "layout".
            nodes.forEach(function (n, i) {
                n.x = i * barHeight;
            });

            // Update the nodes
            var node = svg.selectAll("g.node")
                .data(nodes, function (d) {
                    return d.id || (d.id = ++i);
                });

            var nodeEnter = node.enter().append("g")
                .attr("class", "node")
                .attr("transform", function (d) {
                    return "translate(" + source.y0 + "," + source.x0 + ")";
                })
                .style("opacity", 1e-6);

            // Enter any new nodes at the parent's previous position.
            nodeEnter.append("rect")
                .attr("y", -barHeight / 2)
                .attr("height", barHeight)
                .attr("width", barWidth)
                .style("fill", color)
                .on("click", click);

            nodeEnter.append("text")
                .attr("dy", 3.5)
                .attr("dx", 5.5)
                .text(function (d) {
                    return getDisplayName(d.methodName);
                });

            // Transition nodes to their new position.
            nodeEnter.transition()
                .duration(duration)
                .attr("transform", function (d) {
                    return "translate(" + d.y + "," + d.x + ")";
                })
                .style("opacity", 1);

            node.transition()
                .duration(duration)
                .attr("transform", function (d) {
                    return "translate(" + d.y + "," + d.x + ")";
                })
                .style("opacity", 1)
                .select("rect")
                .style("fill", color);

            // Transition exiting nodes to the parent's new position.
            node.exit().transition()
                .duration(duration)
                .attr("transform", function (d) {
                    return "translate(" + source.y + "," + source.x + ")";
                })
                .style("opacity", 1e-6)
                .remove();

            // Update the links
            var link = svg.selectAll("path.link")
                .data(tree.links(nodes), function (d) {
                    return d.target.id;
                });

            function getPoints(d){
                var points = [
                    {x: d.source.y, y: d.source.x},
                    {x: d.target.y, y: d.target.x}
                ];
                return line(points);
            }

            // Enter any new links at the parent's previous position.
            link.enter().insert("path", "g")
                .attr("class", "link")
                .attr("d", function (d) {
                    return getPoints(d);
                })
                .transition()
                .duration(duration)
                .attr("d", function(d){
                    return getPoints(d);
                });

            // Transition links to their new position.
            link.transition()
                .duration(duration)
                .attr("d", function(d){
                    return getPoints(d);
                });

            // Transition exiting nodes to the parent's new position.
            link.exit().transition()
                .duration(duration)
                .attr("d", function (d) {
                   return getPoints(d);
                })
                .remove();

            // Stash the old positions for transition.
            nodes.forEach(function (d) {
                d.x0 = d.x;
                d.y0 = d.y;
            });
        }

        // Toggle children on click.
        function click(d) {
            toggle(d);
            update(d);
        }

        function toggle(d) {
            if (d.children) {
                d._children = d.children;
                d.children = null;
            } else {
                d.children = d._children;
                d._children = null;
            }
        }

        function color(d) {
            return d._children ? "#3182bd" : d.children ? "#c6dbef" : "#fd8d3c";
        }

    }

    return {
        render: plot,
        sampleData: sampleData
    };
});

// var data = data from sample.json
// data["OptionalTasks:1"].methodName = "org.apache.cassandra.Root.root()";
// var tr = require("app/treeRenderer");
// tr.render("body > .ui-layout-center > .data", data["OptionalTasks:1"])
// tr.render("body > .ui-layout-center > .data", createTree(data))

