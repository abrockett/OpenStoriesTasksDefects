Ext.define('Rally.apps.openstoriestasksdefects.App', {
    extend: 'Rally.app.TimeboxScopedApp',
    componentCls: 'app',
    scopeType: 'iteration',

    comboboxConfig: {
        fieldLabel: 'Select Iteration:',
        labelWidth: 100,
        width: 300
    },

    addContent: function() {
        this.add({
            xtype: 'container',
            itemId: 'userNameHeader',
            componentCls: 'mainHeader'
        }, {
            xtype: 'container',
            itemId: 'storyComps',
            items: [{
                xtype: 'displayfield',
                itemId: 'story-title',
                value: '<p style="font-size:13px">No Stories in Iteration</p><br />',
                componentCls: 'gridTitle'
            }]
        }, {
            xtype: 'container',
            itemId: 'defectComps',
            items: [{
                xtype: 'displayfield',
                itemId: 'defect-title',
                value: '<p style="font-size:13px">No Defects in Iteration</p><br />',
                componentCls: 'gridTitle'
            }]
        }, {
            xtype: 'container',
            itemId: 'taskComps',
            items: [{
                xtype: 'displayfield',
                itemId: 'task-title',
                value: '<p style="font-size:13px">No Tasks in Iteration</p><br />',
                componentCls: 'gridTitle'
            }]
        });

        this._query();
    },

    onScopeChange: function() {
        this._query();
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
            filters: [
                this.getContext().getTimeboxScope().getQueryFilter(),
                {
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
                }
            ],
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
            filters: [
                this.getContext().getTimeboxScope().getQueryFilter(),
                {
                    property: 'Owner.UserName',
                    operator: '=',
                    value: username
                }, {
                    property: 'State',
                    operator: '!=',
                    value: 'Completed'
                }
            ],
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
            filters: [
                this.getContext().getTimeboxScope().getQueryFilter(),
                {
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
                }
            ],
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
        this._storyRecords = [];
        var taskList = [], numberTimesLoaded = data.length;
        if (data.length === 0) {
            this._onStoriesInfoLoaded([],0);
        }
        Ext.Array.each(data, function (story, index) {
            this._storyRecords.push({
                FormattedID: story.get('FormattedID'),
                Name: '<div class="parent"><a href="' + Rally.nav.Manager.getDetailUrl(story.get('_ref')) + '" target="_top">' + story.get('FormattedID') + ' ' + story.get('Name') + '</a></div>',
                Status: '<div class="parent">' + story.get('ScheduleState') + '</div>',
                UserName: '<div class="parent">' + this._ownerIfKnown(story.get('Owner')) + '</div>'
            });
            story.getCollection('Tasks').load({
                fetch: ['FormattedID', 'Name', 'State', 'Owner', 'UserName', 'DisplayName'],
                scope: this,
                callback: function(tasks, operation, success) {
                    taskList = taskList.concat(this._getTasks(tasks, story));
                    if ((index+1) === numberTimesLoaded) {
                        this._onStoriesInfoLoaded(taskList, data.length);
                    }
                }
            });
        }, this);
    },

    _onStoriesInfoLoaded: function(tasks, dataLength) {
        var data = [];
        if (this._storyRecords) {
            data = Ext.clone(this._storyRecords);
        }

        var formattedData = this._formatTasks(tasks, data);

        this._onStoriesDataReady(formattedData, dataLength);
    },

    _onTasksDataLoaded: function (store, data) {
        var records = Ext.Array.map(data, function (task) {
            return {
                Name: '<div class="task"><a href="' + Rally.nav.Manager.getDetailUrl(task.get('_ref')) + '" target="_top">' + task.get('FormattedID') + ' ' + task.get('Name') + '</a></div>',
                Status: '<div class="task">' + task.get('State') + '</div>',
                UserName: '<div class="task">' + this._ownerIfKnown(task.get('Owner')) + '</div>'
            };
        }, this);
        this._onTasksDataReady(records, data.length);
        
    },

    _formatTasks: function(tasks, data) {
        var taskID, tempTaskList = [];
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

        return data;
    },

    _onDefectsInfoLoaded: function(tasks, dataLength) {
        var data = [];
        if (this._defectRecords) {
            data = Ext.clone(this._defectRecords);
        }

        var formattedData = this._formatTasks(tasks, data);

        this._onDefectsDataReady(formattedData, dataLength);
    },

    _onDefectsDataLoaded: function (store, data) {
        var taskList = [];
        this._defectRecords = [], numberTimesLoaded = data.length;
        if (data.length === 0) {
            this._onDefectsInfoLoaded([],0);
        }

        Ext.Array.each(data, function (defect, index) {
            this._defectRecords.push({
                FormattedID: defect.get('FormattedID'),
                Name: '<div class="parent"><a href="' + Rally.nav.Manager.getDetailUrl(defect.get('_ref')) + '" target="_top">' + defect.get('FormattedID') + ' ' + defect.get('Name') + '</a></div>',
                Status: '<div class="parent">' + defect.get('ScheduleState') + '</div>',
                UserName: '<div class="parent">' + this._ownerIfKnown(defect.get('Owner')) + '</div>'
            });
            defect.getCollection('Tasks').load({
                fetch: ['FormattedID', 'Name', 'State', 'Owner', 'UserName', 'DisplayName'],
                scope: this,
                callback: function(tasks, operation, success) {
                    taskList = taskList.concat(this._getTasks(tasks, defect));
                    if ((index+1) === numberTimesLoaded) {
                        this._onDefectsInfoLoaded(taskList, data.length);
                    }
                }
            });
        }, this);
    },

    _getTasks: function(tasks, defect) {
        var taskList = [];
        for (var i = 0; i < tasks.length; i++) {
            if (tasks[i].get('State') !== 'Completed'){
                taskList.push({
                    matchedFormattedID: defect.get('FormattedID'),
                    Name: '<div class="child"><a href="' + Rally.nav.Manager.getDetailUrl(tasks[i].raw._ref) + '" target="_top">' + tasks[i].raw.FormattedID + ' ' + tasks[i].raw.Name + '</a></div>',
                    Status: '<div>' + tasks[i].raw.State + '</div>',
                    UserName: '<div>' + this._ownerIfKnown(tasks[i].raw.Owner) + '</div>',
                    FormattedID: tasks[i].get('FormattedID')
                });
            }
        }

        return taskList;
    },

    _onStoriesDataReady: function(data, dataLength) {
        var hide = false, storyTitle;
        if (data.length === 0) {
            storyTitle = 'No Stories In Iteration';
            hide = true;
        } else {
            storyTitle = 'Stories: ' + dataLength;
        }

        this.down('#story-title').update(storyTitle);

        var customStore = this._createCustomStore(data, hide);

        if (!this.storyGrid) {
            this.storyGrid = this._createCustomGrid(customStore, hide, '#storyComps');
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

        this.down('#defect-title').update(defectTitle);
    
        var customStore = this._createCustomStore(data, hide);


        if (!this.defectGrid) {
            this.defectGrid = this._createCustomGrid(customStore, hide, '#defectComps');
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

        this.down('#task-title').update(taskTitle);
    
        var customStore = this._createCustomStore(data, hide);

        if (!this.taskGrid) {
            this.taskGrid = this._createCustomGrid(customStore, hide, '#taskComps');
        } else {
            this.taskGrid.reconfigure(customStore);
            if (data.length === 0) {
                this.taskGrid.setVisible(false);
            } else {
                this.taskGrid.setVisible(true);
            }
        }
    },

    _createCustomField: function(container, title) {
        field = this.down(container).add({
            xtype: 'displayfield',
            value: '<p style="font-size:13px">' + title + '</p><br />',
            componentCls: 'gridTitle'
        });
        return field;
    },

    _createCustomGrid: function(store, hide, container) {
        grid = this.down(container).add({
            xtype: 'rallygrid',
            store: store,
            hidden: hide,
            sortableColumns: false,
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
        return grid;
    },

    _createCustomStore: function(data, hide) {
        store = Ext.create('Rally.data.custom.Store', {
            hidden: hide,
            data: data,
            pageSize: data.length
        });
        return store;
    }
});
