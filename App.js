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
            componentCls: 'mainHeader',
            items: [{
                xtype: 'label',
                itemId: 'user-label',
                text: 'Open Items for unknown',
                componentCls: 'user-header'
            }]
        }, {
            xtype: 'container',
            itemId: 'storyComponents',
            componentCls: 'components',
            items: [{
                xtype: 'label',
                itemId: 'story-title',
                text: 'No Stories in Iteration',
                componentCls: 'gridTitle'
            }]
        }, {
            xtype: 'container',
            itemId: 'defectComponents',
            componentCls: 'components',
            items: [{
                xtype: 'label',
                itemId: 'defect-title',
                value: 'No Defects in Iteration',
                componentCls: 'gridTitle'
            }]
        }, {
            xtype: 'container',
            itemId: 'taskComponents',
            componentCls: 'components',
            items: [{
                xtype: 'label',
                itemId: 'task-title',
                text: 'No Tasks in Iteration',
                componentCls: 'gridTitle'
            }]
        });

        this._query();
    },

    onScopeChange: function() {
        this._query();
    },

    // create wsapi data stores for userstories, defects, tasks
    _query: function () {
        var username = this.getContext().getUser();

        this.down('#user-label').update('<h3>Open Items for ' + username.UserName + ':</h3>');

        Ext.create('Rally.data.WsapiDataStore', {
            model: 'UserStory',
            autoLoad: true,
            fetch: ['ObjectID', 'FormattedID', 'Name', 'ScheduleState', 'State', 'Owner', 'UserName', 'DisplayName', 'Tasks', 'Defects', 'TestCases', 'LastVerdict'],
            filters: [
                this.getContext().getTimeboxScope().getQueryFilter(),
                {
                    property: 'Owner',
                    operator: '=',
                    value: username.getRef()
                }, {
                    property: 'ScheduleState',
                    operator: '<',
                    value: 'Completed'
                }
            ],
            sorters: [{
                property: 'FormattedID',
                direction: 'ASC'
            }],
            listeners: {
                load: this._onStoriesStoreLoaded,
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
                    property: 'Owner',
                    operator: '=',
                    value: username.getRef()
                }, {
                    property: 'ScheduleState',
                    operator: '<',
                    value: 'Completed'
                }
            ],
            sorters: [{
                property: 'FormattedID',
                direction: 'ASC'
            }],
            listeners: {
                load: this._onDefectsStoreLoaded,
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
                    property: 'Owner',
                    operator: '=',
                    value: username.getRef()
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
                load: this._onTasksStoreLoaded,
                scope: this
            }
        });
    },

    // creaty custom story records and get collection of tasks for each story
    _onStoriesStoreLoaded: function (store, data) {
        this._storyRecords = [];
        var taskList = [];
        var numberTimesLoaded = data.length;
        var counter = 0;
        if (data.length === 0) {
            this._onStoriesDataLoaded([],0);
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
                    counter++;
                    taskList = taskList.concat(this._getTasks(tasks, story));
                    if (counter === numberTimesLoaded) {
                        this._onStoriesDataLoaded(taskList, data.length);
                    }
                }
            });
        }, this);
    },

    // creaty custom defect records and get collection of tasks for each defect
    _onDefectsStoreLoaded: function (store, data) {
        this._defectRecords = [];
        var taskList = [];
        var numberTimesLoaded = data.length;
        var counter = 0;
        if (data.length === 0) {
            this._onDefectsDataLoaded([],0);
        }

        Ext.Array.each(data, function (defect, index) {
            this._defectRecords.push({
                FormattedID: defect.get('FormattedID'),
                Name: '<div class="parent"><a href="' + Rally.nav.Manager.getDetailUrl(defect.get('_ref')) + 
                    '" target="_top">' + defect.get('FormattedID') + ' ' + defect.get('Name') + '</a></div>',
                Status: '<div class="parent">' + defect.get('ScheduleState') + '</div>',
                UserName: '<div class="parent">' + this._ownerIfKnown(defect.get('Owner')) + '</div>'
            });
            defect.getCollection('Tasks').load({
                fetch: ['FormattedID', 'Name', 'State', 'Owner', 'UserName', 'DisplayName'],
                scope: this,
                callback: function(tasks, operation, success) {
                    counter++;
                    taskList = taskList.concat(this._getTasks(tasks, defect));
                    if (counter === numberTimesLoaded) {
                        this._onDefectsDataLoaded(taskList, data.length);
                    }
                }
            });
        }, this);
    },

    // gets tasks in nice formatted array.
    _getTasks: function(tasks, element) {
        var taskList = [];
        for (var i = 0; i < tasks.length; i++) {
            if (tasks[i].get('State') !== 'Completed'){
                taskList.push({
                    matchedFormattedID: element.get('FormattedID'),
                    Name: '<div class="child"><a href="' + Rally.nav.Manager.getDetailUrl(tasks[i].raw._ref) + 
                        '" target="_top">' + tasks[i].raw.FormattedID + ' ' + tasks[i].raw.Name + '</a></div>',
                    Status: tasks[i].raw.State,
                    UserName: this._ownerIfKnown(tasks[i].raw.Owner),
                    FormattedID: tasks[i].get('FormattedID')
                });
            }
        }

        return taskList;
    },

    // format data by putting tasks into stories array
    _onStoriesDataLoaded: function(tasks, dataLength) {
        var formattedData = this._formatData(tasks, this._storyRecords);

        this._buildStories(formattedData, dataLength);
    },

    // format data by putting tasks into defects array
    _onDefectsDataLoaded: function(tasks, dataLength) {
        var formattedData = this._formatData(tasks, this._defectRecords);

        this._buildDefects(formattedData, dataLength);
    },

    // match tasks with defect / story and insert them into correct spot
    _formatData: function(tasks, data) {
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

    _buildStories: function(data, dataLength) {
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
            this.storyGrid = this._createCustomGrid(customStore, hide, '#storyComponents');
        } else {
            this.storyGrid.reconfigure(customStore);
            if (data.length === 0) {
                this.storyGrid.setVisible(false);
            } else {
                this.storyGrid.setVisible(true);
            }
        }
    },

    _buildDefects: function (data, dataLength){
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
            this.defectGrid = this._createCustomGrid(customStore, hide, '#defectComponents');
        } else {
            this.defectGrid.reconfigure(customStore);
            if (data.length === 0) {
                this.defectGrid.setVisible(false);
            } else {
                this.defectGrid.setVisible(true);
            }
        }
    },

    // build tasks array
    _onTasksStoreLoaded: function (store, data) {
        var records = Ext.Array.map(data, function (task) {
            return {
                Name: '<a href="' + Rally.nav.Manager.getDetailUrl(task.get('_ref')) + 
                    '" target="_top">' + task.get('FormattedID') + ' ' + task.get('Name') + '</a>',
                Status: task.get('State'),
                UserName: this._ownerIfKnown(task.get('Owner'))
            };
        }, this);
        this._buildTasks(records, data.length);
    },

    _buildTasks: function(data, dataLength) {
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
            this.taskGrid = this._createCustomGrid(customStore, hide, '#taskComponents');
        } else {
            this.taskGrid.reconfigure(customStore);
            if (data.length === 0) {
                this.taskGrid.setVisible(false);
            } else {
                this.taskGrid.setVisible(true);
            }
        }
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

    getOptions: function() {
        return [
            {
                text: 'Print',
                handler: this._onButtonPressed,
                scope: this
            }
        ];
    },

    _onButtonPressed: function() {
        var title = this.getContext().getTimeboxScope().getRecord().get('Name');

        // code to get the style that we added in the app.css file
        var css = document.getElementsByTagName('style')[0].innerHTML;

        var options = "toolbar=1,menubar=1,scrollbars=yes,scrolling=yes,resizable=yes,width=1000,height=500";

        var printWindow;
        if (Ext.isIE) {
            printWindow = window.open();
        } else {
            printWindow = window.open('', '', options);
        }
        
        var doc = printWindow.document;


        var username = this.down('#userNameHeader');
        var stories = this.down('#storyComponents');
        var defects = this.down('#defectComponents');
        var tasks = this.down('#taskComponents');

        doc.write('<html><head>' + '<style>' + css + '</style><title>' + title + '</title>');


        doc.write('</head><body class="landscape">');
        doc.write('<p style="font-family:Arial,Helvetica,sans-serif;margin:5px">Iteration: ' + title + '</p><br />');  
        doc.write(username.getEl().dom.innerHTML + '<br />' + stories.getEl().dom.innerHTML + '<br />' +
            defects.getEl().dom.innerHTML + '<br />' + tasks.getEl().dom.innerHTML);
        doc.write('</body></html>');
        doc.close();

        this._injectCSS(printWindow);

        if (Ext.isSafari) {
            var timeout = setTimeout(function() {
                printWindow.print();
            }, 500);
        } else {
            printWindow.print();
        }

    },

    _injectContent: function(html, elementType, attributes, container, printWindow){
        elementType = elementType || 'div';
        container = container || printWindow.document.getElementsByTagName('body')[0];

        var element = printWindow.document.createElement(elementType);

        Ext.Object.each(attributes, function(key, value){
            if (key === 'class') {
                element.className = value;
            } else {
                element.setAttribute(key, value);
            }
        });

        if(html){
            element.innerHTML = html;
        }

        return container.appendChild(element);
    },

    _injectCSS: function(printWindow){
        Ext.each(Ext.query('link'), function(stylesheet){
                this._injectContent('', 'link', {
                rel: 'stylesheet',
                href: stylesheet.href,
                type: 'text/css'
            }, printWindow.document.getElementsByTagName('head')[0], printWindow);
        }, this);

    }
});
