Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',

    // Question:  "tasks" grid filters out items with State = Completed, so should stories / Defects show tasks that are completed?  right now they are being shown.

    items: [{
        xtype: 'container',
        itemId: 'iterationCombobox',
        componentCls: 'combobox'
    }, {
        xtype: 'container',
        itemId: 'userNameHeader',
        componentCls: 'mainHeader'
    }, {
        xtype: 'container',
        itemId: 'storyGridTitle',
        componentCls: 'gridTitle'
    }, {
        xtype: 'container',
        itemId: 'storyGrid',
        componentCls: 'grid'
    }, {
        xtype: 'container',
        itemId: 'defectGridTitle',
        componentCls: 'gridTitle'
    }, {
        xtype: 'container',
        itemId: 'defectGrid',
        componentCls: 'grid'
    }, {
        xtype: 'container',
        itemId: 'taskGridTitle',
        componentCls: 'gridTitle'
    }, {
        xtype: 'container',
        itemId: 'taskGrid',
        componentCls: 'grid'
    }],

    launch: function () {
        this.down('#iterationCombobox').add({
            xtype: 'rallyiterationcombobox',
            itemId: 'iterationComboBox',
            fieldLabel: 'Select Iteration: ',
            width: 310,
            labelWidth: 100,
            labelStyle: 'font-weight:bold;',
            listeners: {
                change: this._query,
                ready: this._query,
                scope: this
            }
        });
    },

    _ownerIfKnown: function (artifact) {
        var name = 'unknown';
        if (artifact._refObjectName && artifact.DisplayName) {
            name = artifact.DisplayName;
        } else if (artifact._refObjectName && artifact.UserName) {
            name = artifact.UserName;
        } else if (artifact._refObjectName) {
            name = artifact._refObjectName;
        }
        return name;
    },

    _query: function () {

        var username = this.getContext().getUser().UserName;

        this.down('#userNameHeader').update('<h3>Open Items for ' + username + ':</h3>');

        Ext.create('Rally.data.WsapiDataStore', {
            model: 'UserStory',
            autoLoad: true,
            fetch: ['ObjectID', 'FormattedID', 'Name', 'ScheduleState', 'State', 'Owner', 'UserName', 'DisplayName', 'Tasks', 'Defects', 'TestCases', 'LastVerdict'],
            filters: [{
                property: 'Iteration.Name',
                operator: '=',
                value: this.down('#iterationComboBox').getRawValue()
            }, {
                property: 'Owner.UserName',
                operator: '=',
                value: username
            }, {
                property: 'ScheduleState',
                operator: '!=',
                value: 'Completed'
            }, {
                property: 'ScheduleState',
                operator: '!=',
                value: 'Accepted'
            }],
            sorters: [{
                property: 'FormattedID',
                direction: 'ASC'
            }],
            listeners: {
                load: this._onStoriesDataLoaded,
                scope: this
            }
        });

        Ext.create('Rally.data.WsapiDataStore', {
            model: 'Task',
            autoLoad: true,
            fetch: ['ObjectID', 'FormattedID', 'Name', 'Owner', 'UserName', 'DisplayName', 'State'],
            filters: [{
                property: 'Iteration.Name',
                operator: '=',
                value: this.down('#iterationComboBox').getRawValue()
            }, {
                property: 'Owner.UserName',
                operator: '=',
                value: username
            }, {
                property: 'State',
                operator: '!=',
                value: 'Completed'
            }],
            sorters: [{
                property: 'FormattedID',
                direction: 'ASC'
            }],
            listeners: {
                load: this._onTasksDataLoaded,
                scope: this
            }
        });

        Ext.create('Rally.data.WsapiDataStore', {
            model: 'Defect',
            autoLoad: true,
            fetch: ['ObjectID', 'FormattedID', 'Name', 'Owner', 'UserName', 'DisplayName', 'ScheduleState', 'Tasks', 'State'],
            filters: [{
                property: 'Iteration.Name',
                operator: '=',
                value: this.down('#iterationComboBox').getRawValue()
            }, {
                property: 'Owner.UserName',
                operator: '=',
                value: username
            }, {
                property: 'ScheduleState',
                operator: '!=',
                value: 'Completed'
            }, {
                property: 'ScheduleState',
                operator: '!=',
                value: 'Accepted'
            }],
            sorters: [{
                property: 'FormattedID',
                direction: 'ASC'
            }],
            listeners: {
                load: this._onDefectsDataLoaded,
                scope: this
            }
        });
    },

    _onStoriesDataLoaded: function (store, data) {
        var me = this;
        this._storyRecords = [];
        var taskList = [];
        if (data.length === 0) {
            me._onStoriesInfoLoaded([],0);
        }
        Ext.Array.each(data, function (story) {
            this._storyRecords.push({
                FormattedID: story.get('FormattedID'),
                Name: '<div class="parent"><a href="' + Rally.nav.Manager.getDetailUrl(story.get('_ref')) + '" target="_top">' + story.get('FormattedID') + ' ' + story.get('Name') + '</a></div>',
                Status: '<div class="parent">' + story.get('ScheduleState') + '</div>',
                UserName: '<div class="parent">' + this._ownerIfKnown(story.get('Owner')) + '</div>'
            });
            var storyStore = story.getCollection('Tasks').load({
                fetch: ['FormattedID', 'Name', 'State', 'Owner', 'UserName', 'DisplayName'],
                callback: function(tasks, operation, success) {
                    for (var i = 0; i < tasks.length; i++) {
                        if (tasks[i].raw.Owner._refObjectName === story.get('Owner')._refObjectName){
                            taskList.push({
                                matchedFormattedID: story.get('FormattedID'),
                                Name: '<div class="child"><a href="' + Rally.nav.Manager.getDetailUrl(tasks[i].raw._ref) + '" target="_top">' + tasks[i].raw.FormattedID + ' ' + tasks[i].raw.Name + '</a></div>',
                                Status: '<div class="child">' + tasks[i].raw.State + '</div>',
                                UserName: '<div class="child">' + me._ownerIfKnown(tasks[i].raw.Owner) + '</div>'
                            });
                        }
                    }
                    //callback is asynchronous so we have to call this function after data comes back!
                    me._onStoriesInfoLoaded(taskList, data.length);
                }
            });
        }, this);
    },

    _onStoriesInfoLoaded: function(tasks, dataLength) {
        var taskID, data;
        if (this._storyRecords) {
            data = Ext.clone(this._storyRecords);
        } else {
            data = [];
        }
        for (var i = 0; i < tasks.length; i++) {
            taskID = tasks[i].matchedFormattedID;
            for (var r = 0; r < data.length; r++) {
                //for (var j = r; j < data.length; j++) {

                //}
                if (data[r].FormattedID === taskID) {
                    Ext.Array.insert(data, r+1, [tasks[i]]);
                    break;
                }
            }
        }
        this._onStoriesDataReady(data, dataLength);
    },

    _onTasksDataLoaded: function (store, data) {
        debugger;
        var records = [];
        Ext.Array.each(data, function (task) {
            records.push({
                Name: '<div class="task"><a href="' + Rally.nav.Manager.getDetailUrl(task.get('_ref')) + '" target="_top">' + task.get('FormattedID') + ' ' + task.get('Name') + '</a></div>',
                Status: '<div class="task">' + task.get('State') + '</div>',
                UserName: '<div class="task">' + this._ownerIfKnown(task.get('Owner')) + '</div>'
            });
        }, this);
        this._onTasksDataReady(records, data.length);
        //if (records.length > 0) {
        //    this._onTasksDataReady(records, data.length);
        //} else {
        //    if (this.taskGrid) {
        //        this.taskGrid.destroy();
        //    }
        //}
        if (data.length === 0) {
            this.down('#taskGridTitle').update('No Tasks In Iteration');
        }
    },

    _onDefectsInfoLoaded: function(tasks, dataLength) {
        var taskID, data;
        if (this._defectRecords) {
            data = Ext.clone(this._defectRecords);
        } else {
            data = [];
        }
        for (var i = 0; i < tasks.length; i++) {
            taskID = tasks[i].matchedFormattedID;
            for (var r = 0; r < data.length; r++) {
                if (data[r].FormattedID === taskID) {
                    //for (var j = r; j < data.length; j++) {
                    //    if (data[j].FormattedID !== taskID) {
                    //        Ext.Array.insert(data, j+1, [tasks[i]]);
                    //        break;
                    //    }
                    //}
                    Ext.Array.insert(data, r+1, [tasks[i]]);
                    break;
                }
            }
        }
        this._onDefectsDataReady(data, dataLength);
    },

    _onDefectsDataLoaded: function (store, data) {
        var me = this, taskList = [];
        this._defectRecords = [];
        if (data.length === 0) {
            me._onDefectsInfoLoaded([],0);
        }
        Ext.Array.each(data, function (defect) {
            this._defectRecords.push({
                FormattedID: defect.get('FormattedID'),
                Name: '<div class="parent"><a href="' + Rally.nav.Manager.getDetailUrl(defect.get('_ref')) + '" target="_top">' + defect.get('FormattedID') + ' ' + defect.get('Name') + '</a></div>',
                Status: '<div class="parent">' + defect.get('ScheduleState') + '</div>',
                UserName: '<div class="parent">' + this._ownerIfKnown(defect.get('Owner')) + '</div>'
            });
            var defectStore = defect.getCollection('Tasks').load({
                fetch: ['FormattedID', 'Name', 'State', 'Owner', 'UserName', 'DisplayName'],
                callback: function(tasks, operation, success) {
                    for (var i = 0; i < tasks.length; i++) {
                        if (tasks[i].raw.Owner._refObjectName === defect.get('Owner')._refObjectName){
                            taskList.push({
                                matchedFormattedID: defect.get('FormattedID'),
                                Name: '<div class="child"><a href="' + Rally.nav.Manager.getDetailUrl(tasks[i].raw._ref) + '" target="_top">' + tasks[i].raw.FormattedID + ' ' + tasks[i].raw.Name + '</a></div>',
                                Status: '<div class="child">' + tasks[i].raw.State + '</div>',
                                UserName: '<div class="child">' + me._ownerIfKnown(tasks[i].raw.Owner) + '</div>'
                            });
                        }
                    }
                    me._onDefectsInfoLoaded(taskList, data.length);
                }
            });
        }, this);
    },

    _onStoriesDataReady: function(data, dataLength) {
        var hide = false;
        if (data.length === 0) {
            this.down('#storyGridTitle').update('No Stories In Iteration');
            hide = true;
        } else {
            this.down('#storyGridTitle').update('Stories: ' + dataLength);
        }
        var customStore = Ext.create('Rally.data.custom.Store', {
            data: data,
            pageSize: data.length
        });

        if (!this.storyGrid) {
            this.storyGrid = this.down('#storyGrid').add({
                xtype: 'rallygrid',
                store: customStore,
                hidden: hide,
                sortableColumns: false,
                showPagingToolbar: false,
                columnCfgs: [{
                    text: 'Story',
                    dataIndex: 'Name',
                    cls: 'columnHeader',
                    flex: 4
                }, {
                    text: 'Status',
                    dataIndex: 'Status',
                    cls: 'columnHeader',
                    flex: 1
                }, {
                    text: 'Owner',
                    dataIndex: 'UserName',
                    cls: 'columnHeader',
                    flex: 1
                }]
            });
        } else {
            this.storyGrid.reconfigure(customStore);
            if (data.length === 0) {
                this.storyGrid.setVisible(false);
            } else {
                this.storyGrid.setVisible(true);
            }
        }
    },

    _onDefectsDataReady: function (data, dataLength){
        debugger;
        var hide = false;
        if (data.length === 0) {
            this.down('#defectGridTitle').update('No Defects In Iteration');
            hide = true;
        } else {
            this.down('#defectGridTitle').update('Defects: ' + dataLength);
        }
        var customStore = Ext.create('Rally.data.custom.Store', {
            data: data,
            pageSize: data.length
        });

        if (!this.defectGrid) {
            this.defectGrid = this.down('#defectGrid').add({
                xtype: 'rallygrid',
                store: customStore,
                hidden: hide,
                sortableColumns: false,
                showPagingToolbar: false,
                columnCfgs: [{
                    text: 'Defect',
                    dataIndex: 'Name',
                    cls: 'columnHeader',
                    flex: 4
                }, {
                    text: 'Status',
                    dataIndex: 'Status',
                    cls: 'columnHeader',
                    flex: 1
                }, {
                    text: 'Owner',
                    dataIndex: 'UserName',
                    cls: 'columnHeader',
                    flex: 1
                }]
            });
        } else {
            this.defectGrid.reconfigure(customStore);
            if (data.length === 0) {
                this.defectGrid.setVisible(false);
            } else {
                this.defectGrid.setVisible(true);
            }
        }
    },

    _onTasksDataReady: function(data, dataLength) {
        //debugger;
        var hide = false;
        if (data.length === 0) {
            hide = true;
        }
        var customStore = Ext.create('Rally.data.custom.Store', {
            hidden: hide,
            data: data,
            pageSize: data.length
        });

        this.down('#taskGridTitle').update('Tasks: ' + dataLength);

        if (!this.taskGrid) {
            this.taskGrid = this.down('#taskGrid').add({
                xtype: 'rallygrid',
                store: customStore,
                hidden: hide,
                sortableColumns: false,
                showPagingToolbar: false,
                columnCfgs: [{
                    text: 'Task',
                    dataIndex: 'Name',
                    cls: 'columnHeader',
                    flex: 4
                }, {
                    text: 'Status',
                    dataIndex: 'Status',
                    cls: 'columnHeader',
                    flex: 1
                }, {
                    text: 'Owner',
                    dataIndex: 'UserName',
                    cls: 'columnHeader',
                    flex: 1
                }]
            });
        } else {
            this.taskGrid.reconfigure(customStore);
            if (data.length === 0) {
                this.taskGrid.setVisible(false);
            } else {
                this.taskGrid.setVisible(true);
            }
        }
    }
});
