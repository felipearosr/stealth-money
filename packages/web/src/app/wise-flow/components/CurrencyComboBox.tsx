import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

const currencies = [
  { value: "clp", label: "CLP", name: "Chilean Peso", flag: "https://hatscripts.github.io/circle-flags/flags/cl.svg" },
  { value: "usd", label: "USD", name: "United States dollar", flag: "https://hatscripts.github.io/circle-flags/flags/us.svg" },
  { value: "eur", label: "EUR", name: "Euro", flag: "https://hatscripts.github.io/circle-flags/flags/eu.svg" },
  { value: "aed", label: "AED", name: "United Arab Emirates dirham", flag: "https://hatscripts.github.io/circle-flags/flags/ae.svg" },
  { value: "ars", label: "ARS", name: "Argentine peso", flag: "https://hatscripts.github.io/circle-flags/flags/ar.svg" },
  { value: "aud", label: "AUD", name: "Australian dollar", flag: "https://hatscripts.github.io/circle-flags/flags/au.svg" },
  { value: "bdt", label: "BDT", name: "Bangladeshi taka", flag: "https://hatscripts.github.io/circle-flags/flags/bd.svg" },
  { value: "bgn", label: "BGN", name: "Bulgarian lev", flag: "https://hatscripts.github.io/circle-flags/flags/bg.svg" },
]

interface CurrencyComboBoxProps {
  selectedCurrency: string;
  onSelectCurrency: (currency: string) => void;
}

export function CurrencyComboBox({ selectedCurrency, onSelectCurrency }: CurrencyComboBoxProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[200px] justify-between bg-gray-100 border-none"
        >
          <img src={currencies.find((c) => c.value === selectedCurrency)?.flag} alt={selectedCurrency} className="w-6 h-6 mr-2" />
          {selectedCurrency.toUpperCase()}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command>
          <CommandInput placeholder="Type a currency / country" />
          <CommandEmpty>No currency found.</CommandEmpty>
          <CommandGroup>
            {currencies.map((currency) => (
              <CommandItem
                key={currency.value}
                value={currency.value}
                onSelect={(currentValue) => {
                  onSelectCurrency(currentValue)
                  setOpen(false)
                }}
              >
                <img src={currency.flag} alt={currency.label} className="w-6 h-6 mr-2" />
                <span className="font-medium mr-2">{currency.label}</span>
                <span className="text-gray-500">{currency.name}</span>
                <Check
                  className={cn(
                    "ml-auto h-4 w-4",
                    selectedCurrency === currency.value ? "opacity-100" : "opacity-0"
                  )}
                />
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
