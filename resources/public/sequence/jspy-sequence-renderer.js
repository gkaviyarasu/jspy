/*global window:false, jQuery : false, JUMLY:false*/
var JSPY = JSPY || {};
(function(JSPY, $){	
	var sequenceRenderer = (function(){
								function appendNode(jsonNode, level){
									var returnSplits = splitClassnMethod(jsonNode.methodName),
											text = [spaceStr(2 * level),
													'@message "',returnSplits[1],
													'", "',returnSplits[0],'"'].join(''),
											returntextArr = [];															
									if(jsonNode.children && jsonNode.children.length > 0){
										text += ', ->';
									}
									returntextArr.push(text);
									$.each(jsonNode.children, function(){
										returntextArr = returntextArr.concat(appendNode(this,  level+1));
									});
									return returntextArr;
								}
								function spaceStr(noOfSpaces){
									var spaceStrArr = [];
									for(var i =0; i < noOfSpaces; i++){
										spaceStrArr.push(' ');
									}
									return spaceStrArr.join('');
								}
								function splitClassnMethod(str){
									str = str.split('(');
									var splits = str[0].split('.'),
										totalSplits = splits.length,
										returnSplits = [];

									returnSplits.push(splits[totalSplits-2]);
									returnSplits.push(splits[totalSplits-1]+'('+str[1]);
									return returnSplits;
								}
								return {
									"render" : function(element, title, children){
										var textArr = [],
											container = $(element);

										textArr.push('@found "'+title+'", ->');
										$.each(children, function(){
											textArr = textArr.concat(appendNode(this,  1));
										});
										container.empty();
										container.text(textArr.join('\n'));
										JUMLY.eval(container, {
											'into' : container
										});
										var headerContainer = $('<div class="sequence-diagram-header"></div>');
										var bodyContainer = $('<div class="sequence-diagram-body"></div>');
										var sequenceContainer = container.find('.sequence-diagram');
										headerContainer.append(sequenceContainer.find('.participant, .horizontal'));
										bodyContainer.append(sequenceContainer.find('>:not(.participant)'));
										sequenceContainer.append(headerContainer);
										sequenceContainer.append(bodyContainer);
										$(window).scroll(function(){
											headerContainer.hide();
											headerContainer.css('top', '0px');
											headerContainer.css('top', $(window).scrollTop(),+'px');
											headerContainer.animate({
												display: "toggle" 
											},100);
										});
									}
								};
							}());
	
	JSPY.renderSequence = function(element, title, children){
		sequenceRenderer.render(element, title, children);
	};
	
})(JSPY, jQuery);