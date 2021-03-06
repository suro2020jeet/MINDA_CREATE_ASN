sap.ui.define([
	"sap/ui/model/json/JSONModel",
	"com/minda/CreateAsn/controller/BaseController",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	'sap/ui/model/Sorter',
	'sap/m/MessageBox',
	"sap/ui/core/Element",
	"sap/m/MessageToast",
	"com/minda/CreateAsn/model/formatter"
], function (JSONModel, Controller, Filter, FilterOperator, Sorter, MessageBox, Element, MessageToast, formatter) {
	"use strict";

	return Controller.extend("com.minda.CreateAsn.controller.Master", {
		formatter: formatter,
		onInit: function () {
			// debugger;
			this.getOwnerComponent().setModel(new JSONModel({
				busy: true,
				PageNumber: "1",
				plant: "1031",
				VendorId: "0000200323",
				showAdvancedSearch: false
			}), "listViewModel");
			this.oRouter = this.getOwnerComponent().getRouter();
			this._bDescendingSort = false;
			if (!sap.ushell) {} else {
				if (sap.ui.getCore().plants != undefined) {
					if (sap.ui.getCore().plants.hasOwnProperty("plant")) {
						if (sap.ui.getCore().plants.plant) {
							this.getOwnerComponent().getModel("listViewModel").setProperty("/plant", sap.ui.getCore().plants.plant);
							this._getMasterListData(this.getOwnerComponent().getModel("listViewModel").getProperty("/PageNumber"));
						}
					}
					sap.ui.getCore().plants.registerListener(function (val) {
						if (val) {
							this.getOwnerComponent().getModel("listViewModel").setProperty("/plant", val);
							this._getMasterListData(this.getOwnerComponent().getModel("listViewModel").getProperty("/PageNumber"));
						}
					}.bind(this));
				}
			}
			// this._getUserDetails();
			// this._getMasterListData(this.getOwnerComponent().getModel("listViewModel").getProperty("/PageNumber"));
		},

		onListItemPress: function (oEvent) {
			oEvent.getParameter("listItem").setSelected(true);
			this.oRouter.navTo("detail", {
				AgreementNo: oEvent.getParameter("listItem").getBindingContext("aggrements").getObject().AgreementNo
			});
			this.getOwnerComponent().getModel("layout").setProperty("/layout", "TwoColumnsMidExpanded");
		},
		onSearch: function (oEvent) {
			var oTableSearchState = [],
				sQuery = oEvent.getParameter("newValue");
			if (sQuery && sQuery.length > 0) {
				oTableSearchState = [new Filter("AgreementNo", FilterOperator.Contains, sQuery)];
			}
			this.getView().byId("table").getBinding("items").filter(oTableSearchState, "Application");
		},

		onSort: function (oEvent) {
			this._bDescendingSort = !this._bDescendingSort;
			var oView = this.getView(),
				oTable = oView.byId("table"),
				oBinding = oTable.getBinding("items"),
				oSorter = new Sorter("AgreementNo", this._bDescendingSort);
			oBinding.sort(oSorter);
		},
		onUpdateFinished: function (oEvent) {
			var oParams = oEvent.getParameters();
			if (oParams.reason !== "Growing") {
				if (oEvent.getSource().getItems()[0] == undefined) {
					this.oRouter.navTo("404");
				} else {
					if (!this.getOwnerComponent().getModel("device").getProperty("/system/phone")) {
						oEvent.getSource().getItems()[0].setSelected(true);
						this.oRouter.navTo("detail", {
							AgreementNo: oEvent.getSource().getItems()[0].getBindingContext("aggrements").getObject().AgreementNo
						});
					}

				}
				return;
			}
			var PageNumber = (parseInt(this.getOwnerComponent().getModel("listViewModel").getProperty("/PageNumber")) + 1) + "";
			this.getOwnerComponent().getModel("listViewModel").setProperty("/PageNumber", PageNumber);
			this._getMasterListData(this.getOwnerComponent().getModel("listViewModel").getProperty("/PageNumber"));

		},
		_applyFilter: function (oFilter) {
			var oTable = this.byId("table");
			oTable.getBinding("items").filter(oFilter);
		},

		handleFacetFilterReset: function (oEvent) {
			var oFacetFilter = Element.registry.get(oEvent.getParameter("id")),
				aFacetFilterLists = oFacetFilter.getLists();

			for (var i = 0; i < aFacetFilterLists.length; i++) {
				aFacetFilterLists[i].setSelectedKeys();
			}

			this._applyFilter([]);
		},

		handleListClose: function (oEvent) {
			// Get the Facet Filter lists and construct a (nested) filter for the binding
			var oFacetFilter = oEvent.getSource().getParent();

			this._filterModel(oFacetFilter);
		},

		handleConfirm: function (oEvent) {
			// Get the Facet Filter lists and construct a (nested) filter for the binding
			var oFacetFilter = oEvent.getSource();
			this._filterModel(oFacetFilter);
			MessageToast.show("confirm event fired");
		},

		_filterModel: function (oFacetFilter) {
			var mFacetFilterLists = oFacetFilter.getLists().filter(function (oList) {
				return oList.getSelectedItems().length;
			});

			if (mFacetFilterLists.length) {
				// Build the nested filter with ORs between the values of each group and
				// ANDs between each group
				var oFilter = new Filter(mFacetFilterLists.map(function (oList) {
					return new Filter(oList.getSelectedItems().map(function (oItem) {
						return new Filter(oList.getKey(), "EQ", oItem.getText());
					}), false);
				}), true);
				this._applyFilter(oFilter);
			} else {
				this._applyFilter([]);
			}
		}

	});

});