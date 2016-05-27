try {
    importPackage(javax.management);
}catch(error){
    ManagementFactory = Java.type("java.lang.management.ManagementFactory");
    ObjectName = Java.type("javax.management.ObjectName");
}

function listMbeans() {
    var svr = ManagementFactory.getPlatformMBeanServer();
    return _.toJson(_.each(_.toArray(svr.queryMBeans(null, null)), function(mBean) {return '' + mBean.getObjectName();}));
}


function getMBeanAttrValues(name) {
    var svr = ManagementFactory.getPlatformMBeanServer();
    var mbeanName = new ObjectName(name);
    var mBean = svr.getMBeanInfo(mbeanName);
    var attrNames = _.each(mBean.getAttributes(),function(attr){return attr.getName();});
    return _.toArray(svr.getAttributes(mbeanName, attrNames));
}

function getAllValuesForMBean(name) {
    return _.toJson(
        _.each(getMBeanAttrValues(name), 
               function(attr){ 
                   return {'name': '' + attr.getName(), 'value': '' + attr.getValue()};}));
}

