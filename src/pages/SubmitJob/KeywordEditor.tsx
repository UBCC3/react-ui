import { useState } from "react";
import { MolmakerDropdown, MolmakerTextField } from "../../components/custom";
import { Button, Grid, Box, IconButton, TextField } from "@mui/material";
import { Add, DeleteOutlineOutlined } from "@mui/icons-material";
import * as React from "react";


export interface Keyword {
    key: string,
    type: string,
    value: any
}

const KEYWORD_VALUE_TYPE = [
    { label: "String", value: "string" },
    { label: "Integer", value: "int" },
    { label: "Float", value: "float" },
    { label: "List", value: "list" },
    { label: "Boolean", value: "bool" },
]

const keywordBlankRow: Keyword = { key: "", type: "string", value: ""}

export function KeywordEditor({ maxEntries = 20, onChange }) {
    const [keywords, setKeywords] = useState([]);

    const renderValueField = (row, idx) => {
        const commonProps = {
            fullWidth: true,
            value: row.value,
            onChange: (e) => updateKeywordRow(idx, "value", e.target.value),
        };

        switch (row.type) {
            case "string":
                return (
                    <MolmakerTextField
                        {...commonProps}
                        label="String"
                    />
                )

            case "int":
                return (
                    <MolmakerTextField
                        {...commonProps}
                        label="Integer"
                        type="number"
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            const val = e.target.value;
                            if (/^-?\d*$/.test(val)) {
                                updateKeywordRow(idx, "value", parseInt(val));
                            }
                        }}
                    />
                )

            case "float":
                return (
                    <MolmakerTextField
                        {...commonProps}
                        label="Float"
                        type="number"
                    />
                )

            case "list":
                return (
                    <TextField
                        {...commonProps}
                        label="List"
                        multiline={true}
                        placeholder="[1, 2, 3]"
                        minRows={1}
                        maxRows={4}
                    />
                )

            case "bool":
                return (
                    <MolmakerDropdown
                        {...commonProps}
                        label="Boolean"
                        options={[
                            { label: "True", value: "true" },
                            { label: "False", value: "false" },
                        ]}
                    />
                )
        }

    };

    const updateKeywordRow = (rowIndexToUpdate, field, newVal) => {
        const updatedKeywords = keywords.map((r, i) => (i === rowIndexToUpdate ? { ...r, [field]: newVal } : r));
        setKeywords(updatedKeywords);
        onChange?.(updatedKeywords.filter(r => r.key.trim() !== ""));
    }

    const addKeywordRow = () => {
        if (keywords.length < maxEntries) {
            setKeywords([
                ...keywords,
                keywordBlankRow,
            ]);
        }
    }

    const deleteKeywordRow = (idx:number) => {
        const nextRows = keywords.filter((_, i) => i !== idx);
        setKeywords(nextRows.length ? nextRows : []);
        onChange?.(nextRows.filter(r => r.key.trim() !== ""));
    }

    return (
        <Box>
            {keywords.map((keywordRow, idx) => (
                <Grid container spacing={2} sx={{ my: 2 }} display="flex" alignItems="center" justifyContent="center" key={idx}>
                    <Grid size={{ xs: 8, md: 3 }}>
                        <MolmakerTextField
                            fullWidth={true}
                            label="Keyword"
                            type='string'
                            value={keywordRow.key}
                            onChange={((e: React.ChangeEvent<HTMLInputElement>) => {
                                updateKeywordRow(idx, "key", e.target.value)
                            })}
                        />
                    </Grid>
                    <Grid size={{ xs: 4, md: 3 }}>
                        <MolmakerDropdown
                            fullWidth
                            label={"Type"}
                            value={keywordRow.type}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                updateKeywordRow(idx, "type", e.target.value)
                            }}
                            options={KEYWORD_VALUE_TYPE.map((availableType) => ({
                                    label: availableType.label,
                                    value: availableType.value,
                                })
                            )}
                        />
                    </Grid>
                    <Grid size={{ xs: 11, md: 5 }}>
                        { renderValueField(keywordRow, idx) }
                    </Grid>
                    <Grid size={1}>
                        <IconButton
                            aria-label="delete row"
                            color="error"
                            onClick={() => deleteKeywordRow(idx)}
                        >
                            <DeleteOutlineOutlined fontSize="small" />
                        </IconButton>
                    </Grid>
                </Grid>
            ))}
            <Grid container justifyContent="flex-end">
                <Button
                    variant="outlined"
                    startIcon={<Add />}
                    disabled={keywords.length >= maxEntries}
                    onClick={addKeywordRow}
                    sx={{
                        textTransform: "none",
                    }}
                >
                    Add keyword
                </Button>
            </Grid>
        </Box>
    )
}