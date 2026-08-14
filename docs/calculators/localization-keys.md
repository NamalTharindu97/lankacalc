# Calculator Localization Key Inventory

## Approval

- Status: Approved Stage 0 baseline
- Approval basis: the repository owner authorized phased implementation on 2026-08-14
- Source language: English
- Target languages: Sinhala and Tamil

These stable semantic keys define the content that must be translated. API field identifiers and units remain unchanged across locales.

## Common Keys

```text
calculator.action.calculate
calculator.status.calculating
calculator.section.inputs
calculator.section.result
calculator.section.assumptions
calculator.section.warnings
calculator.section.normalizedInputs
calculator.section.sources
calculator.section.ruleVersions
calculator.error.invalidInput
calculator.error.unavailable
calculator.notice.estimate
calculator.provenance.calculationVersion
calculator.provenance.lastVerified
```

## Age

```text
calculator.age.name
calculator.age.summary
calculator.age.input.dateOfBirth
calculator.age.input.asOfDate
calculator.age.output.completedYears
calculator.age.output.totalDays
calculator.age.assumption.dateOnly
calculator.age.warning.leapDay
calculator.age.error.invalidDate
calculator.age.error.birthAfterAsOf
```

## Percentage

```text
calculator.percentage.name
calculator.percentage.summary
calculator.percentage.input.percentage
calculator.percentage.input.value
calculator.percentage.output.percentageValue
calculator.percentage.assumption.rounding
```

## Compound Interest

```text
calculator.compoundInterest.name
calculator.compoundInterest.summary
calculator.compoundInterest.input.principal
calculator.compoundInterest.input.annualRatePercent
calculator.compoundInterest.input.years
calculator.compoundInterest.input.compoundsPerYear
calculator.compoundInterest.option.annually
calculator.compoundInterest.option.quarterly
calculator.compoundInterest.option.monthly
calculator.compoundInterest.option.daily
calculator.compoundInterest.output.finalAmount
calculator.compoundInterest.output.totalInterest
calculator.compoundInterest.assumption.nominalRate
calculator.compoundInterest.assumption.fixedRate
calculator.compoundInterest.warning.exclusions
```

## Area

```text
calculator.area.name
calculator.area.summary
calculator.area.input.shape
calculator.area.input.unit
calculator.area.input.length
calculator.area.input.width
calculator.area.input.base
calculator.area.input.height
calculator.area.input.radius
calculator.area.option.rectangle
calculator.area.option.triangle
calculator.area.option.circle
calculator.area.option.metre
calculator.area.option.centimetre
calculator.area.option.foot
calculator.area.output.area
calculator.area.output.squareMetres
calculator.area.assumption.sameUnit
```

## Loan EMI

```text
calculator.loanEmi.name
calculator.loanEmi.summary
calculator.loanEmi.input.principal
calculator.loanEmi.input.annualRatePercent
calculator.loanEmi.input.termMonths
calculator.loanEmi.output.monthlyPayment
calculator.loanEmi.output.finalPayment
calculator.loanEmi.output.totalPayment
calculator.loanEmi.output.totalInterest
calculator.loanEmi.assumption.nominalRate
calculator.loanEmi.assumption.finalAdjustment
calculator.loanEmi.assumption.fixedRate
calculator.loanEmi.warning.exclusions
```

## Fuel Consumption

```text
calculator.fuelConsumption.name
calculator.fuelConsumption.summary
calculator.fuelConsumption.input.distance
calculator.fuelConsumption.input.distanceUnit
calculator.fuelConsumption.input.fuelVolume
calculator.fuelConsumption.input.volumeUnit
calculator.fuelConsumption.option.kilometre
calculator.fuelConsumption.option.mile
calculator.fuelConsumption.option.litre
calculator.fuelConsumption.option.usGallon
calculator.fuelConsumption.option.imperialGallon
calculator.fuelConsumption.output.kilometresPerLitre
calculator.fuelConsumption.output.litresPerHundredKilometres
calculator.fuelConsumption.assumption.sameMeasurementPeriod
```
