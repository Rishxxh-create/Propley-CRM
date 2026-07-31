import * as React from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { RiArrowDownSLine } from "react-icons/ri"

export interface PhoneInputProps extends Omit<React.ComponentProps<"input">, "onChange" | "value"> {
  value?: string;
  onChange?: (value: string) => void;
  defaultCountryCode?: string;
}

export const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ className, value = "", onChange, defaultCountryCode = "+91", ...props }, ref) => {
    const [countryCode, setCountryCode] = React.useState(defaultCountryCode);
    const [phoneNumber, setPhoneNumber] = React.useState("");

    React.useEffect(() => {
      if (!value) {
        setPhoneNumber("");
        return;
      }
      
      let newCountryCode = countryCode;
      let newPhoneNumber = value;
      
      const cleanValue = value.trim();
      const firstSpace = cleanValue.indexOf(" ");
      
      if (firstSpace !== -1) {
        let parsedCode = cleanValue.substring(0, firstSpace);
        if (!parsedCode.startsWith("+")) {
          parsedCode = "+" + parsedCode;
        }
        newCountryCode = parsedCode;
        newPhoneNumber = cleanValue.substring(firstSpace + 1);
      } else {
        const digitsOnly = cleanValue.replace(/\D/g, '');
        const isTenDigits = digitsOnly.length === 10;
        
        if (isTenDigits && !cleanValue.startsWith('+')) {
          newPhoneNumber = cleanValue;
        } else {
          let foundCode = false;
          const validCodes = ["+91", "+1", "+44", "+61", "+971"];
          for (const code of validCodes) {
            if (cleanValue.startsWith(code)) {
              newCountryCode = code;
              newPhoneNumber = cleanValue.substring(code.length).trim();
              foundCode = true;
              break;
            }
          }
          
          if (!foundCode) {
            const validCodesNoPlus = ["91", "1", "44", "61", "971"];
            for (const code of validCodesNoPlus) {
              if (cleanValue.startsWith(code)) {
                newCountryCode = "+" + code;
                newPhoneNumber = cleanValue.substring(code.length).trim();
                foundCode = true;
                break;
              }
            }
          }
          
          if (!foundCode) {
            newPhoneNumber = cleanValue;
          }
        }
      }
      
      setCountryCode(newCountryCode);
      setPhoneNumber(newPhoneNumber);
      
      const formatted = `${newCountryCode.replace('+', '')} ${newPhoneNumber}`.trim();
      if (value !== formatted && onChange) {
        // Emit the correctly formatted value without '+' back to the parent immediately
        onChange(formatted);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newPhone = e.target.value;
      setPhoneNumber(newPhone);
      if (onChange) {
        onChange(`${countryCode.replace('+', '')} ${newPhone}`.trim());
      }
    };

    const handleCountryCodeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newCode = e.target.value;
      setCountryCode(newCode);
      if (onChange) {
        onChange(`${newCode.replace('+', '')} ${phoneNumber}`.trim());
      }
    };

    return (
      <div className={cn("flex w-full items-end gap-3", className)}>
        <div className="relative flex items-center shrink-0 w-[110px]">
          <select
            value={countryCode}
            onChange={handleCountryCodeChange}
            className="flex h-12 w-full appearance-none border-b border-stone-alt bg-transparent px-0 py-2 pr-6 text-sm font-semibold transition-colors focus:border-gold focus:outline-none cursor-pointer z-10"
          >
            <option value="+91">IN (+91)</option>
            <option value="+1">US (+1)</option>
            <option value="+44">UK (+44)</option>
            <option value="+61">AU (+61)</option>
            <option value="+971">AE (+971)</option>
          </select>
          <div className="absolute right-0 text-zinc-400 pointer-events-none z-0">
            <RiArrowDownSLine size={16} />
          </div>
        </div>
        <div className="flex-1">
          <Input
            {...props}
            type="tel"
            value={phoneNumber}
            onChange={handlePhoneChange}
            ref={ref}
            className="w-full"
          />
        </div>
      </div>
    );
  }
)
PhoneInput.displayName = "PhoneInput"
