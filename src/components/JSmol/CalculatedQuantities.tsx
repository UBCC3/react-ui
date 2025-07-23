import React from "react";
import {Table, TableBody, TableCell, TableContainer, TableHead, TableRow} from "@mui/material";
import {blueGrey, grey} from "@mui/material/colors";
import {Job} from "../../types";

interface CalculatedQuantitiesProps {
	job: Job,
	result: any,
}

const CalculatedQuantities: React.FC<CalculatedQuantitiesProps> = ({
	job,
	result,
}) => {
	const scf_energy: number = result.extras.qcvars["SCF TOTAL ENERGY"];
	const mp2_energy: number | undefined = result.extras.qcvars["MP2 TOTAL ENERGY"];
	const quantities: { label: string; value: any}[] = [
		{ label: 'method', value: job.method },
		{ label: 'Basis', value: job.basis_set },
		{ label: 'SCF Energy', value: `${scf_energy} Hartree` },
	];

	if (mp2_energy) {quantities.push({ label: 'MP2 Energy', value: `${mp2_energy} Hartree` })}

	quantities.push({ label: 'CPU time', value: job.runtime })

	return (
		<TableContainer sx={{ flex: 1 }}>
			<Table>
				<TableHead>
					<TableRow sx={{ bgcolor: grey[200] }}>
						<TableCell>Quantity</TableCell>
						<TableCell>Value</TableCell>
					</TableRow>
				</TableHead>
				<TableBody>
					{quantities.map((item, index) => (
						<TableRow
							key={index}
							sx={{
								cursor: 'pointer',
								bgcolor: grey[50],
								'&:hover': {
									backgroundColor: blueGrey[50],
								},
							}}
						>
							<TableCell>{item.label}</TableCell>
							<TableCell>{item.value}</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</TableContainer>
	);
}

export default CalculatedQuantities;