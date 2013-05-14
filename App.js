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

    _ownerIfKnown: function (arti) {
        return (arti) ? ((arti.DisplayName) ? arti.DisplayName : ((arti.UserName) ? arti.UserName : '')) : '';
    },

    _query: function () {

        this.down('#userNameHeader').update('<h3>Open Items for __USER_NAME__:</h3>');

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
                value: '__USER_NAME__'
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
                value: '__USER_NAME__'
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
                value: '__USER_NAME__'
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
        var records = [],
            that = this;
        Ext.Array.each(data, function (story) {
            records.push({
                Name: '<div class="parent"><a href="' + Rally.util.Navigation.createRallyDetailUrl(story.get('_ref')) + '" target="_top">' + story.get('FormattedID') + ' ' + story.get('Name') + '</a></div>',
                Status: '<div class="parent">' + story.get('ScheduleState') + '</div>',
                UserName: '<div class="parent">' + that._ownerIfKnown(story.get('Owner')) + '</div>'
            });
            Ext.Array.each(story.get('Tasks'), function (task) {
                records.push({
                    Name: '<div class="child"><a href="' + Rally.util.Navigation.createRallyDetailUrl(task._ref) + '" target="_top">' + task.FormattedID + ' ' + task.Name + '</a></div>',
                    Status: task.State,
                    UserName: that._ownerIfKnown(task.Owner)
                });
            });
        });

        var customStore = Ext.create('Rally.data.custom.Store', {
            data: records,
            pageSize: 25
        });

        this.down('#storyGridTitle').update('Stories: ' + data.length);

        if (!this.storyGrid) {
            this.storyGrid = this.down('#storyGrid').add({
                xtype: 'rallygrid',
                store: customStore,
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
        }
    },

    _onTasksDataLoaded: function (store, data) {
        var records = [],
            that = this;
        Ext.Array.each(data, function (task) {
            records.push({
                Name: '<div class="task"><a href="' + Rally.util.Navigation.createRallyDetailUrl(task.get('_ref')) + '" target="_top">' + task.get('FormattedID') + ' ' + task.get('Name') + '</a></div>',
                Status: '<div class="task">' + task.get('State') + '</div>',
                UserName: '<div class="task">' + that._ownerIfKnown(task.get('Owner')) + '</div>'
            });
        });

        var customStore = Ext.create('Rally.data.custom.Store', {
            data: records,
            pageSize: records.length
        });

        this.down('#taskGridTitle').update('Tasks: ' + data.length);

        if (!this.taskGrid) {
            this.taskGrid = this.down('#taskGrid').add({
                xtype: 'rallygrid',
                store: customStore,
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
        }
    },

    _onDefectsDataLoaded: function (store, data) {
        var records = [],
            that = this;
        Ext.Array.each(data, function (defect) {
            records.push({
                Name: '<div class="parent"><a href="' + Rally.util.Navigation.createRallyDetailUrl(defect.get('_ref')) + '" target="_top">' + defect.get('FormattedID') + ' ' + defect.get('Name') + '</a></div>',
                Status: '<div class="parent">' + defect.get('ScheduleState') + '</div>',
                UserName: '<div class="parent">' + that._ownerIfKnown(defect.get('Owner')) + '</div>'
            });
            Ext.Array.each(defect.get('Tasks'), function (task) {
                records.push({
                    Name: '<div class="child"><a href="' + Rally.util.Navigation.createRallyDetailUrl(task._ref) + '" target="_top">' + task.FormattedID + ' ' + task.Name + '</a></div>',
                    Status: task.State,
                    UserName: that._ownerIfKnown(task.Owner)
                });
            });
        });

        var customStore = Ext.create('Rally.data.custom.Store', {
            data: records,
            pageSize: records.length
        });

        this.down('#defectGridTitle').update('Defects: ' + data.length);


        if (!this.defectGrid) {
            this.defectGrid = this.down('#defectGrid').add({
                xtype: 'rallygrid',
                store: customStore,
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
        }
    }
});