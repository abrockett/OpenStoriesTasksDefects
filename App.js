Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',

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
        itemId: 'storyComps',
    }, {
        xtype: 'container',
        itemId: 'defectComps',
    }, {
        xtype: 'container',
        itemId: 'taskComps',
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
        if (artifact === null) {
            name = '-';
        } else if (artifact._refObjectName && artifact.DisplayName) {
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
                        if (tasks[i].get('State') !== 'Completed'){
                            taskList.push({
                                matchedFormattedID: story.get('FormattedID'),
                                Name: '<div class="child"><a href="' + Rally.nav.Manager.getDetailUrl(tasks[i].raw._ref) + '" target="_top">' + tasks[i].raw.FormattedID + ' ' + tasks[i].raw.Name + '</a></div>',
                                Status: '<div>' + tasks[i].raw.State + '</div>',
                                UserName: '<div>' + me._ownerIfKnown(tasks[i].raw.Owner) + '</div>'
                            });
                        }
                    }
                    me._onStoriesInfoLoaded(taskList, data.length);
                }
            });
        }, this);
    },

    _onStoriesInfoLoaded: function(tasks, dataLength) {
        var taskID, data, tempTaskList = [];
        if (this._storyRecords) {
            data = Ext.clone(this._storyRecords);
        } else {
            data = [];
        }
        for (var i = 0; i < tasks.length; i++) {
            taskID = tasks[i].matchedFormattedID;
            for (var j = i; j < tasks.length; j++) {
                if (tasks[j].matchedFormattedID === taskID) {
                    Ext.Array.insert(tempTaskList, j+1, [tasks[j]]);
                    i++;
                }
            }
            for (var r = 0; r < data.length; r++) {
                if (data[r].FormattedID === taskID) {
                    Ext.Array.insert(data, r+1, tempTaskList);
                    break;
                }
            }
            tempTaskList = [];
            i--;
        }
        this._onStoriesDataReady(data, dataLength);
    },

    _onTasksDataLoaded: function (store, data) {
        var records = [];
        Ext.Array.each(data, function (task) {
            records.push({
                Name: '<div class="task"><a href="' + Rally.nav.Manager.getDetailUrl(task.get('_ref')) + '" target="_top">' + task.get('FormattedID') + ' ' + task.get('Name') + '</a></div>',
                Status: '<div class="task">' + task.get('State') + '</div>',
                UserName: '<div class="task">' + this._ownerIfKnown(task.get('Owner')) + '</div>'
            });
        }, this);
        this._onTasksDataReady(records, data.length);
        
    },

    _onDefectsInfoLoaded: function(tasks, dataLength) {
        var taskID, data, tempTaskList = [];
        if (this._defectRecords) {
            data = Ext.clone(this._defectRecords);
        } else {
            data = [];
        }
        for (var i = 0; i < tasks.length; i++) {
            taskID = tasks[i].matchedFormattedID;
            for (var j = i; j < tasks.length; j++) {
                if (tasks[j].matchedFormattedID === taskID) {
                    Ext.Array.insert(tempTaskList, j+1, [tasks[j]]);
                    i++;
                }
            }
            for (var r = 0; r < data.length; r++) {
                if (data[r].FormattedID === taskID) {
                    Ext.Array.insert(data, r+1, tempTaskList);
                    break;
                }
            }
            tempTaskList = [];
            i--;
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
                        if (tasks[i].get('State') !== 'Completed'){
                            taskList.push({
                                matchedFormattedID: defect.get('FormattedID'),
                                Name: '<div class="child"><a href="' + Rally.nav.Manager.getDetailUrl(tasks[i].raw._ref) + '" target="_top">' + tasks[i].raw.FormattedID + ' ' + tasks[i].raw.Name + '</a></div>',
                                Status: '<div>' + tasks[i].raw.State + '</div>',
                                UserName: '<div>' + me._ownerIfKnown(tasks[i].raw.Owner) + '</div>',
                                FormattedID: tasks[i].get('FormattedID')
                            });
                        }
                    }
                    me._onDefectsInfoLoaded(taskList, data.length);
                }
            });
        }, this);
    },

    _onStoriesDataReady: function(data, dataLength) {
        var hide = false, storyTitle;
        if (data.length === 0) {
            storyTitle = 'No Stories In Iteration';
            hide = true;
        } else {
            storyTitle = 'Stories: ' + dataLength;
        }

        if (!this.storyField) {
            this.storyField = this.down('#storyComps').add({
                xtype: 'displayfield',
                value: '<p style="font-size:13px">' + storyTitle + '</p><br />',
                componentCls: 'gridTitle'
            });
        } else {
            this.storyField.update(storyTitle);
        }

        var customStore = Ext.create('Rally.data.custom.Store', {
            data: data,
            pageSize: data.length
        });

        if (!this.storyGrid) {
            this.storyGrid = this.down('#storyComps').add({
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
        var hide = false, defectTitle;
        if (data.length === 0) {
            defectTitle = 'No Defects In Iteration';
            hide = true;
        } else {
            defectTitle = 'Defects: ' + dataLength;
        }

        var customStore = Ext.create('Rally.data.custom.Store', {
            data: data,
            pageSize: data.length
        });

        if (!this.defectField) {
            this.defectField = this.down('#defectComps').add({
                xtype: 'displayfield',
                value: '<p style="font-size:13px">' + defectTitle + '</p><br />',
                componentCls: 'gridTitle'
            });
        } else {
            this.defectField.update(defectTitle);
        }

        if (!this.defectGrid) {
            this.defectGrid = this.down('#defectComps').add({
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
        var hide = false, taskTitle;
        if (dataLength === 0) {
            taskTitle = 'No Tasks In Iteration';
            hide = true;
        } else {
            taskTitle = 'Tasks: ' + dataLength;
        }

        var customStore = Ext.create('Rally.data.custom.Store', {
            hidden: hide,
            data: data,
            pageSize: data.length
        });

        if (!this.taskField) {
            this.taskField = this.down('#taskComps').add({
                xtype: 'displayfield',
                value: '<p style="font-size:13px">' + taskTitle + '</p><br />',
                componentCls: 'gridTitle'
            });
        } else {
            this.taskField.update(taskTitle);
        }

        if (!this.taskGrid) {
            this.taskGrid = this.down('#taskComps').add({
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
