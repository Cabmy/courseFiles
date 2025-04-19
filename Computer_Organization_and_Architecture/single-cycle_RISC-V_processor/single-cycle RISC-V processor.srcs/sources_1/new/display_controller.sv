module display_controller(
    input logic clk,
    input logic reset,
    input logic [9:0] operand1,  // {hundreds[1:0], tens[3:0], ones[3:0]}
    input logic [9:0] operand2,  // Same format
    input logic [19:0] result,   // Binary result value
    input logic display_enable,
    output logic [7:0] AN,
    output logic [6:0] A2G
);
    logic [2:0] digit_select;
    logic [19:0] refresh_counter;
    logic [3:0] digit_value;
    logic [11:0] result_bcd;  // For storing BCD result
    
    // Binary to BCD conversion for result
    function automatic [11:0] binary_to_bcd_result(input [7:0] binary);
        logic [19:0] shift_reg;
        logic [3:0] hundreds, tens, ones;
        
        // Initialize shift register with binary value in the least significant bits
        shift_reg = {{12{1'b0}}, binary};
        
        // Perform Double Dabble algorithm
        for (int i = 0; i < 8; i++) begin
            // Check if any BCD digit is > 4, if so add 3
            if (shift_reg[11:8] > 4) shift_reg[11:8] = shift_reg[11:8] + 3;
            if (shift_reg[15:12] > 4) shift_reg[15:12] = shift_reg[15:12] + 3;
            if (shift_reg[19:16] > 4) shift_reg[19:16] = shift_reg[19:16] + 3;
            
            // Shift left by 1
            shift_reg = shift_reg << 1;
        end
        
        hundreds = shift_reg[19:16];
        tens = shift_reg[15:12];
        ones = shift_reg[11:8];
        
        return {hundreds, tens, ones};
    endfunction

    // Refresh counter
    always_ff @(posedge clk or posedge reset) begin
        if (reset) 
            refresh_counter <= 20'b0;
        else 
            refresh_counter <= refresh_counter + 1;
    end

    assign digit_select = refresh_counter[19:17];  // About every 10.5ms switch display digit

    // Calculate BCD result
    always_comb begin
        result_bcd = binary_to_bcd_result(result[7:0]); // Only take the lower 8 bits of result
    end

    // Select which digit to display - with direct equals sign handling
    always_comb begin
        if (digit_select == 3'b100) begin
            // Forced equals sign display at position 5
            digit_value = 4'h10;  // Hard-coded equals sign
        end else begin
            case (digit_select)
                3'b000: digit_value = operand1[7:4];    // op1 tens
                3'b001: digit_value = operand1[3:0];    // op1 ones
                3'b010: digit_value = operand2[7:4];    // op2 tens
                3'b011: digit_value = operand2[3:0];    // op2 ones
                // 3'b100 is handled above - equals sign
                3'b101: digit_value = result_bcd[11:8]; // result hundreds
                3'b110: digit_value = result_bcd[7:4];  // result tens
                3'b111: digit_value = result_bcd[3:0];  // result ones
                default: digit_value = 4'hF;            // blank
            endcase
        end
    end

    // 7-segment decoder with direct port connection
    logic [6:0] segments_internal;
    
    always_comb begin
        case (digit_value)
            //              gfedcba
            4'h0: segments_internal = 7'b0000001; //0
            4'h1: segments_internal = 7'b1001111; //1
            4'h2: segments_internal = 7'b0010010; //2
            4'h3: segments_internal = 7'b0000110; //3
            4'h4: segments_internal = 7'b1001100; //4
            4'h5: segments_internal = 7'b0100100; //5
            4'h6: segments_internal = 7'b0100000; //6
            4'h7: segments_internal = 7'b0001111; //7
            4'h8: segments_internal = 7'b0000000; //8
            4'h9: segments_internal = 7'b0000100; //9
            4'h10: segments_internal = 7'b1110110; //= (equals sign)
            4'h11: segments_internal = 7'b1001110; //+ (plus sign)
            4'h12: segments_internal = 7'b1111110; //- (minus sign)
            4'h13: segments_internal = 7'b1100010; //* (multiply sign)
            default: segments_internal = 7'b1111111; //blank
        endcase
    end
    
    // Connect directly to the output port
    assign A2G = (digit_select == 3'b100) ? 7'b1110110 : segments_internal;

    // Digit select signal - active low
    // Only enable display when display_enable is high
    always_comb begin
        if (display_enable)
            case (digit_select)
                3'b000: AN = 8'b01111111;  // Activate leftmost digit
                3'b001: AN = 8'b10111111;
                3'b010: AN = 8'b11011111;
                3'b011: AN = 8'b11101111;
                3'b100: AN = 8'b11110111;  // Equals sign position
                3'b101: AN = 8'b11111011;
                3'b110: AN = 8'b11111101;
                3'b111: AN = 8'b11111110;  // Activate rightmost digit
                default: AN = 8'b11111111;  // All off
            endcase
        else
            AN = 8'b11111111;  // Don't display
    end
endmodule