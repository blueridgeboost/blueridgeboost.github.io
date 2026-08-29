import dotenv from 'dotenv';
import {getOrdersByProductId, getCatalog} from '../ecwid.js';
import ExcelJS from 'exceljs';
import path from 'path';
import os from 'os';
import { changeOrderStatus } from './update-orders.mjs';

// Construct the path to the .env file
const envPath = path.join(process.cwd(), '..', '.env');
// Load the .env file
dotenv.config({ path: envPath });

// const ROSTERS_DIR = "G:\\Shared drives\\BRB\\25-26 Classes\\rosters\\"
const ROSTERS_DIR = path.join(os.homedir(), 'OneDrive - Blue Ridge Boost', 'Rosters - Documents');

function getAttributeValue(product, attributeName) {
	const attribute = product.attributes.find(attribute => attribute.name === attributeName);
	if (attribute === undefined) {
		return '';
	} else {
		return attribute.value;
	}
}

async function exportClassesToExcel() {
	const classes = await getCatalog([175340602]);
	const IN_PROGRESS = "CUSTOM_FULFILLMENT_STATUS_1";
	const NEW_ORDER = "AWAITING_PROCESSING";
	const COMPLETED = "CUSTOM_FULFILLMENT_STATUS_2";
	
	const summaryData = [];
	const workbook = new ExcelJS.Workbook();
	
	for (const c of classes) {
		if (!c.enabled) continue;
		const orders = await getOrdersByProductId(c.id);
		let count = 0;
		const classData = [];
		
		for (const order of orders) {
			if ( order.fulfillmentStatus !== COMPLETED) {
				for (const item of order.items) {
					if (item.productId !== c.id) continue;
					// const notes = order?.orderExtraFields?.find(
					// 	field =>
					// 		field.title ===
					// 	"[Optional] Please let us know of anything you think we should be aware of to best teach your student."
					// );
					
					// const getOptionValue = (options, name) =>
					// 	options?.find(opt => opt?.name === name);
					
					// const options = item?.selectedOptions || [];
					
					// if (name1 === undefined) {
					// 	name1 = getOptionValue(options, "Student's Name");
					// }
					// if (grade1 === undefined) {
					// 	grade1 = getOptionValue(options, "Student's Grade");
					// }
					// if (name2 === undefined) {
					// 	name2 = getOptionValue(
					// 		options,
					// 		"Additional Name (if signing up more than one)"
					// 	);
					// }
					// if (grade2 === undefined) {
					// 	grade2 = getOptionValue(options, "Additional Grade");
					// }
					
					// const dayOption = options?.find(
					// 	opt => opt?.name === "Day of the week"
					// );
					// const daysOfWeek =
					// dayOption?.selections?.selectionTitle ??
					// getAttributeValue(c, "day_of_week");
					
					count += item.quantity;
					
					classData.push({
						parentName: order?.billingPerson?.name || "",
						parentEmail: order?.email || "",
						parentPhone: order?.billingPerson?.phone || "",
						// childName: name1?.value || "",
						// childGrade: grade1?.value || "",
						// daysOfWeek: daysOfWeek || "",
						// selectedOptions:
						// item.selectedOptions && item.selectedOptions.length > 0
						// ? JSON.stringify(item.selectedOptions[0].value)
						// : "",
						// notes: notes?.value || "",
					});
					
					if (item.quantity > 1) {
						console.log(`${c.sku} ${count}`)
						classData.push({
							parentName: order?.billingPerson?.name || "",
							parentEmail: order?.email || "",
							parentPhone: order?.billingPerson?.phone || "",
							// childName: name2?.value || "",
							// childGrade: grade2?.value || "",
							// daysOfWeek: daysOfWeek || "",
							// selectedOptions:
							// item.selectedOptions && item.selectedOptions.length > 0
							// ? JSON.stringify(item.selectedOptions[0].value)
							// : "",
							// notes: notes?.value || "",
						});
					}
				}
			}
		}
		console.log(`${c.sku}-${c.name} count: ${count}`);
		if (count > 0) {
			const brbId = getAttributeValue(c, "brb_id");
			
			summaryData.push({
				brbId: brbId,
				className: c.name,
				count: count,
				daysOfWeek: getAttributeValue(c, "day_of_week"),
				startDate: getAttributeValue(c, "start_date"),
				endDate: getAttributeValue(c, "end_date"),
				startTime: getAttributeValue(c, "start_time"),
				endTime: getAttributeValue(c, "end_time"),
			});
			

			const sheetName = makeSafeSheetName(
				`${c.sku}-${c.name}`.slice(0, 31)
			);
			const worksheet = workbook.addWorksheet(sheetName);
			
			worksheet.columns = [
				{ header: "Parent Name", key: "parentName", width: 24 },
				{ header: "Parent Email", key: "parentEmail", width: 30 },
				{ header: "Parent Phone", key: "parentPhone", width: 18 },
				{ header: "Child Name", key: "childName", width: 24 },
				{ header: "Child Grade", key: "childGrade", width: 14 },
				{ header: "Days of Week", key: "daysOfWeek", width: 18 },
				{ header: "Selected Options", key: "selectedOptions", width: 30 },
				{ header: "Notes", key: "notes", width: 50 },
			];
			
			worksheet.addRows(classData);
			
			styleHeaderRow(worksheet);
		}
	}
	
	const summarySheet = workbook.addWorksheet("Summary");
	summarySheet.columns = [
		{ header: "BRB ID", key: "brbId", width: 14 },
		{ header: "Class Name", key: "className", width: 32 },
		{ header: "Count", key: "count", width: 10 },
		{ header: "Days of Week", key: "daysOfWeek", width: 18 },
		{ header: "Start Date", key: "startDate", width: 14 },
		{ header: "End Date", key: "endDate", width: 14 },
		{ header: "Start Time", key: "startTime", width: 14 },
		{ header: "End Time", key: "endTime", width: 14 },
	];
	summarySheet.addRows(summaryData);
	styleHeaderRow(summarySheet);
	
	// Put Summary first
	workbook.worksheets.splice(
		workbook.worksheets.indexOf(summarySheet),
		1
	);
	workbook.worksheets.unshift(summarySheet);
	
	const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
	await workbook.xlsx.writeFile(
	path.join(ROSTERS_DIR, `classes-${today}.xlsx`)
	);
}

function styleHeaderRow(worksheet) {
	const headerRow = worksheet.getRow(1);
	headerRow.font = { bold: true };
	headerRow.alignment = { vertical: "middle", horizontal: "center" };
	
	headerRow.eachCell(cell => {
		cell.fill = {
			type: "pattern",
			pattern: "solid",
			fgColor: { argb: "D9EAF7" },
		};
		cell.border = {
			top: { style: "thin" },
			left: { style: "thin" },
			bottom: { style: "thin" },
			right: { style: "thin" },
		};
	});
}

function makeSafeSheetName(name) {
	return name
	.replace(/[\\/*?:[\]]/g, "")
	.trim()
	.slice(0, 31) || "Sheet";
}



async function main() {
	changeOrderStatus();
	//await exportClassesToExcel();
}



main();