sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/export/Spreadsheet",
	"sap/m/MessageToast",
	"sap/m/MessageBox",
	"com/minda/CreateAsn/model/formatter",
	"sap/ui/core/util/ExportTypeCSV",
	"sap/ui/core/util/Export",
	"sap/ui/core/Fragment",
	"sap/ui/core/format/NumberFormat"
], function (Controller, JSONModel, Filter, FilterOperator, Spreadsheet, MessageToast, MessageBox, formatter, ExportTypeCSV, Export,
	Fragment, NumberFormat) {
	"use strict";

	return Controller.extend("com.minda.CreateAsn.controller.Detail", {
		formatter: formatter,
		onInit: function () {
			this.oRouter = this.getOwnerComponent().getRouter();
			this.oModel = this.getOwnerComponent().getModel();
			this.oRouter.getRoute("master").attachPatternMatched(this._onProductMatched, this);
			this.oRouter.getRoute("detail").attachPatternMatched(this._onProductMatched, this);
			// this.oWizard = this.getView().byId("wizard");
			// this.oWizard._getProgressNavigator().ontap = function (oEvent) {
			// 	debugger;
			// }.bind(this);
		},
		// handleFullScreen: function () {
		// 	this.getView().getModel("detailViewModel").setProperty("/fullScreenButtonVisible", false);
		// 	this.getView().getModel("detailViewModel").setProperty("/exitFSButtonVisible", true);
		// 	this.getOwnerComponent().getModel("layout").setProperty("/layout", "MidColumnFullScreen");
		// },
		// exitFullScreen: function () {
		// 	this.getView().getModel("detailViewModel").setProperty("/exitFSButtonVisible", false);
		// 	this.getView().getModel("detailViewModel").setProperty("/fullScreenButtonVisible", true);
		// 	this.getOwnerComponent().getModel("layout").setProperty("/layout", "TwoColumnsMidExpanded");
		// },
		handleClose: function () {
			// this.getView().getModel("detailViewModel").setProperty("/exitFSButtonVisible", false);
			// this.getView().getModel("detailViewModel").setProperty("/fullScreenButtonVisible", true);
			// this.getOwnerComponent().getModel("layout").setProperty("/layout", "OneColumn");
			this.oRouter.navTo("master");
		},
		_onProductMatched: function (oEvent) {
			var oCurrencyFormat = NumberFormat.getCurrencyInstance({
				currencyCode: false
			});
			var oWizard = this.byId("wizard");
			var oFirstStep = oWizard.getSteps()[0];
			oWizard.discardProgress(oFirstStep);
			oWizard.goToStep(oFirstStep);
			oFirstStep.setValidated(false);
			this._product = oEvent.getParameter("arguments").AgreementNo || this._product || "0";
			var date = new Date(),
				previousMonth = new Date();
			previousMonth.setDate(date.getDate() - 30);
			var FirstDay = new Date(date.getFullYear(), date.getMonth(), "01");
			this.getView().setModel(new JSONModel({
				uploadCSVButtonVisible: true,
				taxTableData: [],
				downloadTemplVisible: false,
				fullScreenButtonVisible: true,
				busy: true,
				exitFSButtonVisible: false,
				fromDate: FirstDay,
				toDate: date,
				firstStepContinueEnabled: false,
				VendorCode: "0000200323",
				previousMonth: previousMonth,
				sdDate: "",
				invoiceValue: "",
				invoiceNo: "",
				invoiceDate: new Date(),
				trackingNo: "",
				vechileNo: "",
				driverNo: "",
				driverName: "",
				transporterName: "",
				infoToolbarText: "0 Item(s) selected",
				selectedDownloadButtonVisible: false,
				SDDate: "",
				otherValues: oCurrencyFormat.format(0, "INR"),
			}), "detailViewModel");

			this._getDetailViewData();

		},
		handleDateRangeChange: function (oEvent) {
			var Difference_In_Time = oEvent.getSource().getSecondDateValue().getTime() - oEvent.getSource().getDateValue().getTime();
			var Difference_In_Days = Difference_In_Time / (1000 * 3600 * 24);
			if (Difference_In_Days > 31) {
				return MessageToast.show("Can not select more than 31 days...");
			}
			this.getView().getModel("detailViewModel").setProperty("/busy", true);
			this._getDeliveryScheduleData(oEvent.getSource().getDateValue(), oEvent.getSource().getSecondDateValue());
		},
		_getDeliveryScheduleData: function (FirstDay, date) {
			var filter = [];
			filter.push(new sap.ui.model.Filter("AgreementId", sap.ui.model.FilterOperator.EQ, this._product));
			filter.push(new sap.ui.model.Filter("DeliveryDate", sap.ui.model.FilterOperator.BT, FirstDay, date));
			this.getOwnerComponent().getModel().metadataLoaded().then(function () {
				this.getOwnerComponent().getModel("dsService").read("/DelivaryScheduleSet", {
					filters: filter,
					success: function (oData) {
						if (oData.results[0].AgreementId == "") {
							this.getView().getModel("detailViewModel").setProperty("/items", []);
							this.getView().getModel("detailViewModel").setProperty("/tableTitle", "Materials (0)");
						} else {
							this.getView().getModel("detailViewModel").setProperty("/items", oData.results);
							this.getView().getModel("detailViewModel").setProperty("/tableTitle", "Materials (" + oData.results.length + ")");
						}
						this.getView().getModel("detailViewModel").setProperty("/Plant", "MIL - LIGHTING MANESAR(1031)");
						this.getView().getModel("detailViewModel").setProperty("/busy", false);
					}.bind(this),
					error: function (oError) {

					}.bind(this)
				});

			}.bind(this));
		},
		_getDetailViewData: function () {
			this.getOwnerComponent().getModel().metadataLoaded().then(function () {
				this.getOwnerComponent().getModel().read("/SchAgrHeaderSet('" + this._product + "')", {
					urlParameters: {
						"$expand": 'items,items/ItemCond,conditions'
					},
					success: function (oData) {
						for (var key in oData) {
							this.getView().getModel("detailViewModel").setProperty("/" + key, oData[key]);
						}
						this.getView().getModel("detailViewModel").setProperty("/AgreementNo", this._product);
						this.getView().getModel("detailViewModel").setProperty("/Plant", "MIL - LIGHTING MANESAR(1031)");
						this._getDeliveryScheduleData(this.getView().getModel("detailViewModel").getProperty("/previousMonth"), this.getView().getModel(
							"detailViewModel").getProperty("/toDate"));
					}.bind(this),
					error: function (oError) {

					}.bind(this)
				});

			}.bind(this));
		},
		onMaterialCodeSearch: function (oEvent) {
			var oTableSearchState = [],
				sQuery = oEvent.getParameter("newValue");
			if (sQuery && sQuery.length > 0) {
				oTableSearchState = [new Filter("MaterialCode", FilterOperator.Contains, sQuery)];
			}
			this.getView().byId("table").getBinding("items").filter(oTableSearchState, "Application");
		},
		onMaterialNameSearch: function (oEvent) {
			var oTableSearchState = [],
				sQuery = oEvent.getParameter("newValue");
			if (sQuery && sQuery.length > 0) {
				oTableSearchState = [new Filter("MaterialName", FilterOperator.Contains, sQuery)];
			}
			this.getView().byId("table").getBinding("items").filter(oTableSearchState, "Application");
		},
		onPressDownload: function () {
			var oExport = new Export({
				exportType: new ExportTypeCSV({
					fileExtension: "csv",
					separatorChar: ","
				}),
				models: new JSONModel(),
				rows: {
					path: ""
				},
				columns: [{
					name: "Material Code",
					template: {
						content: ""
					}
				}, {
					name: "Delivery Qty.",
					template: {
						content: ""
					}
				}]
			});
			oExport.saveFile("template").catch(function (oError) {

			}).then(function () {
				oExport.destroy();
			});
		},
		onPressDownloadSelected: function () {
			var data = [];
			for (var i = 0; i < this.getView().getModel("detailViewModel").getData().items.length; i++) {
				for (var j = 0; j < this.byId("table").getSelectedItems().length; j++) {
					if (this.byId("table").getSelectedItems()[j].getBindingContext(
							"detailViewModel").getObject().MaterialCode == this.getView().getModel("detailViewModel").getData().items[i].MaterialCode) {
						data.push(this.getView().getModel("detailViewModel").getData().items[i]);
					}
				}
			}
			var selectedItemsModel = new JSONModel(data);
			var oExport = new Export({
				exportType: new ExportTypeCSV({ // required from "sap/ui/core/util/ExportTypeCSV"
					separatorChar: ",",
					charset: "utf-8"
				}),
				models: selectedItemsModel,
				rows: {
					path: "/"
				},
				columns: [{
						name: "Material Code",
						template: {
							content: "{MaterialCode}"
						}
					}, {
						name: "Materoial Name",
						template: {
							content: "{MaterialName}"
						}
					}, {
						name: "Scheduled Date",
						template: {
							content: "{DeliveryDate}"
						}
					}, {
						name: "STD. Pack",
						template: {
							content: "{StandardPack}"
						}
					}, {
						name: "Pending Qty",
						template: {
							content: "{PendingQty}"
						}
					},

				]
			});
			oExport.saveFile("selected_materials").catch(function (oError) {
				MessageBox.error("Error when downloading data. ..." + oError);
			}).then(function () {
				oExport.destroy();
			});
		},
		onSelectionChange: function (oEvent) {
			// oEvent.getSource().getSelectedItems().length;
			if (oEvent.getSource().getSelectedItems().length > 0) {
				this.getView().getModel("detailViewModel").setProperty("/downloadTemplVisible", true);
				this.getView().getModel("detailViewModel").setProperty("/selectedDownloadButtonVisible", true);
				this.getView().getModel("detailViewModel").setProperty("/infoToolbarText", oEvent.getSource().getSelectedItems().length +
					" Item(s) selected");

				var selectedItemWithQuantityCount = 0;

				for (var i = 0; i < oEvent.getSource().getSelectedItems().length; i++) {
					this.getView().getModel("detailViewModel").setProperty("/SDDate", oEvent.getSource().getSelectedItems()[i].getBindingContext(
						"detailViewModel").getObject().DeliveryDate);
					if (parseInt(oEvent.getSource().getSelectedItems()[i].getBindingContext("detailViewModel").getObject().ViewQty) > 0) {
						selectedItemWithQuantityCount++;
					}
				}
				if (selectedItemWithQuantityCount == oEvent.getSource().getSelectedItems().length) {
					this.getView().getModel("detailViewModel").setProperty("/firstStepContinueEnabled", true);
				} else {
					this.getView().getModel("detailViewModel").setProperty("/firstStepContinueEnabled", false);
				}
			} else {
				this.getView().getModel("detailViewModel").setProperty("/downloadTemplVisible", false);
				this.getView().getModel("detailViewModel").setProperty("/SDDate", "");
				this.getView().getModel("detailViewModel").setProperty("/infoToolbarText", "0 Item(s) selected");
				this.getView().getModel("detailViewModel").setProperty("/selectedDownloadButtonVisible", false);
				this.getView().getModel("detailViewModel").setProperty("/firstStepContinueEnabled", false);
			}
		},
		onPressFirstStep: function () {
			MessageBox.confirm("Some materials have ship quantity not in multiples of standard pack. Are you sure you want to continue?", {
				actions: [sap.m.MessageBox.Action.OK,
					sap.m.MessageBox.Action.CANCEL
				],
				onClose: function (oAction) {
					if (oAction == 'CANCEL') {
						return;
					}
					this.getView().getModel("detailViewModel").setProperty("/subTotalVisible", true);
					this.getView().getModel("detailViewModel").setProperty("/secondStepContinueEnabled", true);
					this._getTaxData();
				}.bind(this)
			});

		},
		_getTaxData: function () {
			var promises = [];
			this.getView().getModel("detailViewModel").setProperty("/busy", true);
			for (var i = 0; i < this.byId("table").getSelectedItems().length; i++) {
				var filter = [];
				filter.push(new sap.ui.model.Filter("AgreementNo", sap.ui.model.FilterOperator.EQ, this.byId("table").getSelectedItems()[i].getBindingContext(
					"detailViewModel").getObject().AgreementId));
				filter.push(new sap.ui.model.Filter("AgreementItemNo", sap.ui.model.FilterOperator.EQ, this.byId("table").getSelectedItems()[i].getBindingContext(
					"detailViewModel").getObject().AgreementItem));
				filter.push(new sap.ui.model.Filter("Quantity", sap.ui.model.FilterOperator.EQ, this.byId("table").getSelectedItems()[i].getBindingContext(
					"detailViewModel").getObject().ViewQty));
				promises.push(new Promise(function (resolve, reject) {
					this.getOwnerComponent().getModel("taxService").read("/TaxSet", {
						filters: filter,
						success: function (oData) {
							resolve(oData);
						},
						error: function (oError) {
							reject(oError);
						}
					});
				}.bind(this)));
			}
			Promise.all(promises).then(function (values) {
				this.getView().getModel("detailViewModel").setProperty("/busy", false);
				var items = [],
					subtotal = 0;
				for (var i = 0; i < values.length; i++) {
					values[i].results[0].Uom = this.byId("table").getSelectedItems()[i].getBindingContext("detailViewModel").getObject().Uom;
					values[i].results[0].StandardPack = this.byId("table").getSelectedItems()[i].getBindingContext("detailViewModel").getObject().StandardPack;
					values[i].results[0].DeliveryDate = this.byId("table").getSelectedItems()[i].getBindingContext("detailViewModel").getObject().DeliveryDate;
					values[i].results[0].PendingQty = this.byId("table").getSelectedItems()[i].getBindingContext("detailViewModel").getObject().PendingQty;
					values[i].results[0].Uom = this.byId("table").getSelectedItems()[i].getBindingContext("detailViewModel").getObject().Uom;
					values[i].results[0].Quantity = values[i].results[0].Quantity.trim();
					values[i].results[0].Value = values[i].results[0].Value.trim();
					values[i].results[0].IgstPer = values[i].results[2].Rate;
					values[i].results[0].IgstAmnt = values[i].results[2].Value;
					values[i].results[0].AmountAfterTaxes = ((parseFloat(values[i].results[0].Value.trim()) * 18) / 100).toFixed(2);
					items.push(values[i].results[0]);
					this.getView().getModel("detailViewModel").setProperty("/taxTableDataTitle", "Materials (" + items.length + ")");
					this.getView().getModel("detailViewModel").setProperty("/taxTableData", items);
					subtotal = subtotal + parseFloat(values[i].results[0].Value);
				}
				var tax = (subtotal * 18) / 100;
				// this.getView().getModel("detailViewModel").setProperty("/sdDate", this.getView().getModel("detailViewModel").setProperty("/AgreementDate"));
				this.getView().getModel("detailViewModel").setProperty("/subTotal", subtotal.toFixed(2));
				this.getView().getModel("detailViewModel").setProperty("/totalTax", tax.toFixed(2));
				this.getView().getModel("detailViewModel").setProperty("/totalShipmentValue", (subtotal + tax).toFixed(2));
				this.getView().getModel("detailViewModel").setProperty("/downloadTemplVisible", false);
				this.getView().getModel("detailViewModel").setProperty("/uploadCSVButtonVisible", false);
				this.byId("wizard").nextStep();
			}.bind(this));
		},
		onPressSecondStep: function () {
			this.byId("wizard").nextStep();
		},
		onPressWizardBack: function () {
			this.byId("wizard").previousStep();
		},
		onPressDeleteTableLineItem: function (oEvent) {
			var index = oEvent.getSource().getBindingContext("detailViewModel").getPath().replace("/taxTableData/", "");
			this.getView().getModel("detailViewModel").getProperty("/taxTableData").splice(index, 1);
			var subtotal = 0,
				tax;
			if (this.getView().getModel("detailViewModel").getProperty("/taxTableData").length > 0) {
				this.getView().getModel("detailViewModel").setProperty("/taxTableDataTitle", "Materials (" + this.getView().getModel(
					"detailViewModel").getProperty("/taxTableData").length + ")");
				this.getView().getModel("detailViewModel").setProperty("/secondStepContinueEnabled", true);
				this.getView().getModel("detailViewModel").setProperty("/subTotalVisible", true);
				for (var i = 0; i < this.getView().getModel("detailViewModel").getProperty("/taxTableData").length; i++) {
					subtotal = subtotal + parseFloat(this.getView().getModel("detailViewModel").getProperty("/taxTableData")[i].Value);
				}
				tax = (subtotal * 18) / 100;
			} else {
				this.byId("wizard").goToStep(this.byId("materialSelectStep"));
				this.getView().getModel("detailViewModel").setProperty("/downloadTemplVisible", true);
				this.getView().getModel("detailViewModel").setProperty("/uploadCSVButtonVisible", true);
				this.getView().getModel("detailViewModel").setProperty("/taxTableDataTitle", "Materials (0)");
				this.getView().getModel("detailViewModel").setProperty("/secondStepContinueEnabled", false);
				this.getView().getModel("detailViewModel").setProperty("/subTotalVisible", false);
				tax = 0;
			}
			this.getView().getModel("detailViewModel").setProperty("/subTotal", subtotal.toFixed(2));
			this.getView().getModel("detailViewModel").setProperty("/totalTax", tax.toFixed(2));
			this.getView().getModel("detailViewModel").setProperty("/totalShipmentValue", (subtotal + tax).toFixed(2));
			this.getView().getModel("detailViewModel").refresh();
		},
		onTableLineitemInputChange: function (oEvent) {
			if (this.byId("table").getSelectedItems().length > 0) {
				var selectedItemWithQuantityCount = 0;
				for (var i = 0; i < this.byId("table").getSelectedItems().length; i++) {
					if (parseInt(this.getView().getModel("detailViewModel").getProperty("/items")[i].ViewQty) > 0) {
						selectedItemWithQuantityCount++;
					}
				}
				if (selectedItemWithQuantityCount == this.byId("table").getSelectedItems().length) {
					this.getView().getModel("detailViewModel").setProperty("/firstStepContinueEnabled", true);
				} else {
					this.getView().getModel("detailViewModel").setProperty("/firstStepContinueEnabled", false);
				}
			}
		},
		onPressConfirmASN: function () {
			if (this.getView().getModel("detailViewModel").getProperty("/invoiceValue") == "") {
				return MessageToast.show("Invoice Value can not be empty!", {
					class: "sapErrorMessageToastClass"
				});
			} else if (parseFloat(this.getView().getModel("detailViewModel").getProperty("/totalShipmentValue")) - 1 < parseFloat(this.getView()
					.getModel(
						"detailViewModel").getProperty("/invoiceValue")) && parseFloat(this.getView().getModel("detailViewModel").getProperty(
					"/totalShipmentValue")) + 1 < parseFloat(this.getView().getModel(
					"detailViewModel").getProperty("/invoiceValue"))) {
				return MessageToast.show("Invoice Value should be +/- 1 of Shipment value...", {
					class: "sapErrorMessageToastClass"
				});
			}
			if (this.getView().getModel("detailViewModel").getProperty("/invoiceNo") == "") {
				return MessageToast.show("Invoice No can not be empty!");
			}
			if (this.getView().getModel("detailViewModel").getProperty("/invoiceDate") == "") {
				return MessageToast.show("Invoice Date can not be empty!");
			}
			if (this.getView().getModel("detailViewModel").getProperty("/vechileNo") == "") {
				return MessageToast.show("Vehicle No can not be empty!");
			}
			var taxItem = [];
			for (var i = 0; i < this.getView().getModel("detailViewModel").getProperty("/taxTableData").length; i++) {
				var obj = {};
				obj.AgreementId = this.getView().getModel("detailViewModel").getProperty("/taxTableData")[i].AgreementNo;
				obj.AgreementItem = this.getView().getModel("detailViewModel").getProperty("/taxTableData")[i].AgreementItemNo;
				obj.AmountAfterTaxes = this.getView().getModel("detailViewModel").getProperty("/taxTableData")[i].AmountAfterTaxes;
				obj.AmountBeforeTaxes = this.getView().getModel("detailViewModel").getProperty("/taxTableData")[i].Value;
				obj.AsnDetailsId = "";
				obj.AsnId = "";
				obj.CgstAmnt = "0";
				obj.CgstPer = "0";
				obj.DeliveryDate = this.getView().getModel("detailViewModel").getProperty("/taxTableData")[i].DeliveryDate;
				obj.DeliverySchedule = "";
				obj.DolStatus = "";
				obj.IgstAmnt = this.getView().getModel("detailViewModel").getProperty("/taxTableData")[i].IgstAmnt;
				obj.IgstPer = this.getView().getModel("detailViewModel").getProperty("/taxTableData")[i].IgstPer.trim();
				obj.ItemNo = i + 1 + "";
				obj.ItemPrice = this.getView().getModel("detailViewModel").getProperty("/taxTableData")[i].Value;
				obj.Location = "";
				obj.Material = this.getView().getModel("detailViewModel").getProperty("/taxTableData")[i].MaterialCode;
				obj.MaterialLocation = "";
				obj.MaterialName = this.getView().getModel("detailViewModel").getProperty("/taxTableData")[i].MaterialName;
				obj.Quantity = this.getView().getModel("detailViewModel").getProperty("/taxTableData")[i].Quantity;
				obj.SgstAmnt = "0";
				obj.SgstPer = "0";
				obj.StdPkg = this.getView().getModel("detailViewModel").getProperty("/taxTableData")[i].StandardPack;
				obj.Uom = this.getView().getModel("detailViewModel").getProperty("/taxTableData")[i].Uom;
				taxItem.push(obj);
			}
			var payload = {
				AsnId: "",
				GeNo: "",
				GrNo: "",
				Header: [{
					AsnDetailsId: "",
					AsnId: "",
					CgstAmnt: "0.000000",
					CgstPer: "000",
					CompanyCode: this.getView().getModel("detailViewModel").getProperty("/CompanyCode"),
					CompanyName: this.getView().getModel("detailViewModel").getProperty("/CompCodeName"),
					DocumentDate: this.getView().getModel("detailViewModel").getProperty("/AgreementDate"),
					DriverContactNumber: this.getView().getModel("detailViewModel").getProperty("/driverNo"),
					DriverName: this.getView().getModel("detailViewModel").getProperty("/driverName"),
					IgstAmnt: this.getView().getModel("detailViewModel").getProperty("/totalTax"),
					IgstPer: "000",
					InvoiceDate: this.getView().getModel("detailViewModel").getProperty("/invoiceDate"),
					InvoiceNo: this.getView().getModel("detailViewModel").getProperty("/invoiceNo"),
					InvoiceValue: this.getView().getModel("detailViewModel").getProperty("/invoiceValue"),
					OtherCharges: "0.000000",
					PgCode: this.getView().getModel("detailViewModel").getProperty("/PurchaseGroup"),
					PgName: this.getView().getModel("detailViewModel").getProperty("/PurchaseGrpname"),
					PlantCode: this.getView().getModel("detailViewModel").getProperty("/PurchaseGrpname").split("-")[0],
					PlantName: this.getView().getModel("detailViewModel").getProperty("/Plant"),
					PurchasingGroup: this.getView().getModel("detailViewModel").getProperty("/PurchaseOrg"),
					SgstAmnt: "0.000000",
					SgstPer: "000",
					Status: this.getView().getModel("detailViewModel").getProperty("/Status"),
					StatusReference: "",
					Tax: this.getView().getModel("detailViewModel").getProperty("/totalTax"),
					TotalAmount: this.getView().getModel("detailViewModel").getProperty("/totalShipmentValue"),
					TrackingNo: this.getView().getModel("detailViewModel").getProperty("/trackingNo"),
					TransporterName: this.getView().getModel("detailViewModel").getProperty("/transporterName"),
					VehicleName: "",
					VehicleNo: this.getView().getModel("detailViewModel").getProperty("/vechileNo"),
					VendorCode: this.getView().getModel("detailViewModel").getProperty("/VendorCode"),
					VendorName: this.getView().getModel("detailViewModel").getProperty("/VendorName"),
					Item: taxItem
				}]
			};
			this.getView().getModel("detailViewModel").setProperty("/busy", true);
			this.getOwnerComponent().getModel("asnService").create("/SummarySet", payload, {
				success: function (oData) {
					debugger;
					this.getView().getModel("detailViewModel").setProperty("/busy", false);
					this._openSuccessDialog(oData.AsnId);
				}.bind(this),
				error: function () {

				}.bind(this)
			});
		},
		_openSuccessDialog: function (asnId) {
			new sap.m.Dialog({
				contentHeight: "45%",
				contentWidth: "25%",
				verticalScrolling: false,
				showHeader: false,
				content: [
					new sap.m.VBox({
						width: "100%",
						height: "100%",
						class: "sapUiSmallMarginTop",
						justifyContent: "SpaceAround",
						alignItems: "Center",
						alignContent: "Center",
						items: [
							new sap.m.Avatar({
								src: "../webapp/images/asn.png",
								displaySize: "L",
								displayShape: "Circle",
								showBorder: true
							}),
							new sap.m.VBox({
								justifyContent: "SpaceAround",
								alignItems: "Center",
								items: [
									new sap.m.Label({
										design: "Bold",
										text: "ASN Created"
									}),
									new sap.m.Label({
										design: "Bold",
										text: "ASN Id: " + asnId
									})
								]
							}),
							new sap.m.VBox({
								items: [
									new sap.m.HBox({
										items: [
											new sap.m.Text({
												renderWhitespace: true,
												text: "You can anytime go to "
											}),
											new sap.m.Link({
												text: "ASN List"
											}),
											new sap.m.Text({
												renderWhitespace: true,
												text: " to find your ASN."
											})
										]
									}),
									new sap.m.HBox({
										items: [
											new sap.m.Text({
												renderWhitespace: true,
												text: "Go to "
											}),
											new sap.m.Link({
												text: "Shipments"
											}),
											new sap.m.Text({
												renderWhitespace: true,
												text: " to get PDFs of ASN and BinTags."
											}),
										]
									})
								]
							}),
							new sap.m.Button({
								text: "Close",
								type: "Emphasized",
								press: function (oEvent) {
									oEvent.getSource().getParent().getParent().close();
									window.location.reload();
								}
							})
						]
					})
				]
			}).open();
		},
		onPressUpload: function () {
			Fragment.load({
				name: "com.minda.CreateAsn.fragments.FileUploadDialog",
				controller: this
			}).then(function (oFragment) {
				this.getView().addDependent(oFragment);
				oFragment.open();
			}.bind(this));
		},
		onPressOKDilog: function (oEvent) {
			var count = 0;
			for (var a = 0; a < this.getView().getModel("detailViewModel").getData().items.length; a++) {
				for (var b = 0; b < this.csvItems.length; b++) {
					if (this.getView().getModel("detailViewModel").getData().items[a].MaterialCode == this.csvItems[b].MaterialCode) {
						count++;
						if (parseFloat(this.csvItems[b].ViewQty) == undefined || this.csvItems[b].ViewQty == "" || this.csvItems[b].ViewQty == null ||
							this.csvItems[b].ViewQty ==
							undefined || parseFloat(this.csvItems[b].ViewQty) == NaN) {
							return MessageToast.show("Delivery Quantity should be a Number.Check row " + b + " of uploaded CSV.")
						}
						if (parseFloat(this.csvItems[b].ViewQty) == 0) {
							return MessageToast.show("Delivery Quantity should be greater than 0.Check row " + b + " of uploaded CSV.")
						}
						if (parseFloat(this.csvItems[b].ViewQty) > parseFloat(this.getView().getModel("detailViewModel").getData().items[a].PendingQty)) {
							return MessageToast.show("Delivery quantity can not be greater than Pending quantity.Check row " + b + " of uploaded CSV.");
						} else {
							this.getView().getModel("detailViewModel").getData().items[a].ViewQty = this.csvItems[b].ViewQty;
						}
					}
				}
			}
			if (count == 0) {
				return MessageToast.show("Uploaded CSV material does not match with table Item Materials...")
			}
			this.getView().getModel("detailViewModel").refresh();
			oEvent.getSource().getParent().close();
		},
		onPressCloseDilog: function (oEvent) {
			oEvent.getSource().getParent().close();
		},
		handleValueChange: function (oEvent) {
			var oFileToRead = oEvent.getParameters().files["0"];
			var reader = new FileReader();
			reader.readAsText(oFileToRead);
			reader.onload = function (event) {
				var csv = event.target.result;
				this._processData(csv);
			}.bind(this);
			reader.onerror = function (evt) {
				if (evt.target.error.name == "NotReadableError") {
					alert("Cannot read file !");
				}
			};
		},
		_processData: function (csv) {
			var allTextLines = csv.split(/\r\n|\n/);
			var lines = [];
			for (var i = 0; i < allTextLines.length; i++) {
				var data = allTextLines[i].split(';');
				var tarr = [];
				for (var j = 0; j < data.length; j++) {
					tarr.push(data[j]);
				}
				lines.push(tarr);
			}
			lines.shift();
			lines.pop();
			this.csvItems = []
			for (var i = 0; i < lines.length; i++) {
				var obj = {};
				obj.MaterialCode = lines[i][0].split(",")[0];
				obj.ViewQty = lines[i][0].split(",")[1];
				this.csvItems.push(obj);
			}
		}
	});

});