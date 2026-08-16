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

## Tile Quantity

```text
calculator.tileQuantity.name
calculator.tileQuantity.summary
calculator.tileQuantity.input.length
calculator.tileQuantity.input.width
calculator.tileQuantity.input.unit
calculator.tileQuantity.input.tileLength
calculator.tileQuantity.input.tileWidth
calculator.tileQuantity.input.jointMillimetres
calculator.tileQuantity.input.wastagePercent
calculator.tileQuantity.option.metre
calculator.tileQuantity.option.centimetre
calculator.tileQuantity.option.foot
calculator.tileQuantity.output.floorArea
calculator.tileQuantity.output.effectiveTileLength
calculator.tileQuantity.output.effectiveTileWidth
calculator.tileQuantity.output.tilesBeforeWastage
calculator.tileQuantity.output.tilesAfterWastage
calculator.tileQuantity.assumption.effectiveJoint
calculator.tileQuantity.assumption.rectangularLayout
calculator.tileQuantity.assumption.rounding
calculator.tileQuantity.warning.estimate
calculator.tileQuantity.warning.cuts
```

## Paint

```text
calculator.paint.name
calculator.paint.summary
calculator.paint.input.surfaceArea
calculator.paint.input.unit
calculator.paint.input.coats
calculator.paint.input.coveragePerLitre
calculator.paint.input.wastagePercent
calculator.paint.option.squareMetre
calculator.paint.option.squareFoot
calculator.paint.output.surfaceAreaSquareMetres
calculator.paint.output.areaToCover
calculator.paint.output.exactLitres
calculator.paint.output.litresToBuy
calculator.paint.output.wastageLitres
calculator.paint.assumption.flatCoverage
calculator.paint.assumption.coatsFullArea
calculator.paint.assumption.rounding
calculator.paint.warning.specification
calculator.paint.warning.excluded
```

## Concrete

```text
calculator.concrete.name
calculator.concrete.summary
calculator.concrete.input.length
calculator.concrete.input.width
calculator.concrete.input.depth
calculator.concrete.input.unit
calculator.concrete.input.wastagePercent
calculator.concrete.option.metre
calculator.concrete.option.centimetre
calculator.concrete.option.foot
calculator.concrete.output.volume
calculator.concrete.output.wastageVolume
calculator.concrete.output.totalVolume
calculator.concrete.assumption.measuredFaces
calculator.concrete.assumption.wastage
calculator.concrete.assumption.freshVolume
calculator.concrete.warning.engineering
calculator.concrete.warning.excluded
```

## Brick and Block

```text
calculator.brickBlock.name
calculator.brickBlock.summary
calculator.brickBlock.input.length
calculator.brickBlock.input.height
calculator.brickBlock.input.unit
calculator.brickBlock.input.openingArea
calculator.brickBlock.input.brickLength
calculator.brickBlock.input.brickHeight
calculator.brickBlock.input.jointMillimetres
calculator.brickBlock.input.wastagePercent
calculator.brickBlock.option.metre
calculator.brickBlock.option.centimetre
calculator.brickBlock.option.foot
calculator.brickBlock.output.wallArea
calculator.brickBlock.output.bricksPerSquareMetre
calculator.brickBlock.output.bricksBeforeWastage
calculator.brickBlock.output.bricksAfterWastage
calculator.brickBlock.assumption.singleLeaf
calculator.brickBlock.assumption.defaultBrick
calculator.brickBlock.assumption.openingDeduction
calculator.brickBlock.warning.engineering
calculator.brickBlock.warning.excluded
```

## Steel

```text
calculator.steel.name
calculator.steel.summary
calculator.steel.input.diameterMillimetres
calculator.steel.input.barLengthMetres
calculator.steel.input.bars
calculator.steel.input.wastagePercent
calculator.steel.option.diameter6
calculator.steel.option.diameter8
calculator.steel.option.diameter10
calculator.steel.option.diameter12
calculator.steel.option.diameter16
calculator.steel.option.diameter20
calculator.steel.option.diameter25
calculator.steel.option.diameter32
calculator.steel.output.totalLength
calculator.steel.output.unitWeightKilogrammesPerMetre
calculator.steel.output.weightKilogrammes
calculator.steel.output.wastageKilogrammes
calculator.steel.output.totalKilogrammes
calculator.steel.assumption.d2over162
calculator.steel.assumption.straightBars
calculator.steel.assumption.gradeIndependent
calculator.steel.warning.engineering
calculator.steel.warning.confirmSupplier
```

## Roof Material

```text
calculator.roofMaterial.name
calculator.roofMaterial.summary
calculator.roofMaterial.input.length
calculator.roofMaterial.input.width
calculator.roofMaterial.input.unit
calculator.roofMaterial.input.slopeDegrees
calculator.roofMaterial.input.material
calculator.roofMaterial.input.coveragePerUnit
calculator.roofMaterial.input.wastagePercent
calculator.roofMaterial.option.metre
calculator.roofMaterial.option.centimetre
calculator.roofMaterial.option.foot
calculator.roofMaterial.option.clayTile
calculator.roofMaterial.option.concreteTile
calculator.roofMaterial.option.corrugatedMetalSheet
calculator.roofMaterial.output.footprintArea
calculator.roofMaterial.output.roofArea
calculator.roofMaterial.output.unitsBeforeWastage
calculator.roofMaterial.output.unitsAfterWastage
calculator.roofMaterial.output.unitLabel
calculator.roofMaterial.assumption.singlePlane
calculator.roofMaterial.assumption.effectiveCoverage
calculator.roofMaterial.assumption.rounding
calculator.roofMaterial.warning.engineering
calculator.roofMaterial.warning.trims
```

## Loan Schedule

```text
calculator.loanSchedule.name
calculator.loanSchedule.summary
calculator.loanSchedule.input.asOfDate
calculator.loanSchedule.input.rateSource
calculator.loanSchedule.option.userRate
calculator.loanSchedule.option.platformRate
calculator.loanSchedule.input.principal
calculator.loanSchedule.input.annualRatePercent
calculator.loanSchedule.input.termMonths
calculator.loanSchedule.input.processingFeePercent
calculator.loanSchedule.input.monthlyInsurancePremium
calculator.loanSchedule.input.extraPaymentAmount
calculator.loanSchedule.input.extraPaymentMonth
calculator.loanSchedule.output.monthlyPayment
calculator.loanSchedule.output.finalPayment
calculator.loanSchedule.output.totalPayment
calculator.loanSchedule.output.totalInterest
calculator.loanSchedule.output.processingFeeAmount
calculator.loanSchedule.output.totalInsurance
calculator.loanSchedule.output.totalCost
calculator.loanSchedule.output.appliedAnnualRatePercent
calculator.loanSchedule.output.rateLabel
calculator.loanSchedule.output.rateObservationDate
calculator.loanSchedule.output.rateAuthority
calculator.loanSchedule.output.termMonthsWithExtraPayment
calculator.loanSchedule.output.termMonthsSaved
calculator.loanSchedule.output.finalPaymentWithExtraPayment
calculator.loanSchedule.output.totalPaymentWithExtraPayment
calculator.loanSchedule.output.totalInterestWithExtraPayment
calculator.loanSchedule.output.interestSaved
calculator.loanSchedule.assumption.nominalRate
calculator.loanSchedule.assumption.finalAdjustment
calculator.loanSchedule.assumption.separateFees
calculator.loanSchedule.assumption.earlyPaymentTermReduction
calculator.loanSchedule.assumption.earlyPaymentEstimate
calculator.loanSchedule.warning.estimate
calculator.loanSchedule.warning.observedRateBenchmark
calculator.loanSchedule.warning.exclusions
```

## Lease

```text
calculator.lease.name
calculator.lease.summary
calculator.lease.input.assetValue
calculator.lease.input.deposit
calculator.lease.input.residualValue
calculator.lease.input.annualRatePercent
calculator.lease.input.termMonths
calculator.lease.input.processingFeePercent
calculator.lease.output.financedAmount
calculator.lease.output.monthlyPayment
calculator.lease.output.balloonPayment
calculator.lease.output.totalInstallments
calculator.lease.output.totalInterest
calculator.lease.output.processingFeeAmount
calculator.lease.output.totalCost
calculator.lease.assumption.nominalRate
calculator.lease.assumption.equalInstallments
calculator.lease.assumption.balloonNotAmortized
calculator.lease.assumption.separateFees
calculator.lease.warning.estimate
calculator.lease.warning.exclusions
```

## Electricity

```text
calculator.electricity.name
calculator.electricity.summary
calculator.electricity.input.asOfDate
calculator.electricity.input.unitsConsumed
calculator.electricity.input.billingDays
calculator.electricity.output.category
calculator.electricity.output.energyCharge
calculator.electricity.output.fixedCharge
calculator.electricity.output.tariffCharge
calculator.electricity.output.sscLRatePercent
calculator.electricity.output.sscLAmount
calculator.electricity.output.totalPayable
calculator.electricity.assumption.proration
calculator.electricity.assumption.fixedTier
calculator.electricity.assumption.sscl
calculator.electricity.assumption.vatIncluded
calculator.electricity.warning.estimate
calculator.electricity.warning.officialBill
calculator.electricity.warning.exclusions
calculator.electricity.error.precision
calculator.electricity.error.ruleUnavailable
```


