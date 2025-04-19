module io_interface(
    input logic clk,
    input logic reset,
    input logic btnl,
    input logic btnr,
    input logic [15:0] switches,
    output logic [9:0] operand1,  // {hundreds[1:0], tens[3:0], ones[3:0]}
    output logic [9:0] operand2,  // Same format
    output logic [19:0] result,   // Result for display
    output logic display_enable
);
    typedef enum logic [1:0] {
        STATE_IDLE,
        STATE_INPUT_OPS,
        STATE_DISPLAY
    } state_t;

    state_t state;

    // Input latches for packed BCD format
    logic [7:0] op1_value, op2_value;
    
    // Function to convert from direct BCD input to binary
    function automatic [7:0] bcd_to_binary(input [3:0] tens, input [3:0] ones);
        return (tens * 8'd10) + ones;
    endfunction

    // Temporary variables for BCD digits
    logic [3:0] op1_tens, op1_ones, op2_tens, op2_ones;

    always_ff @(posedge clk or posedge reset) begin
        if (reset) begin
            state <= STATE_IDLE;
            operand1 <= 10'b0;
            operand2 <= 10'b0;
            op1_value <= 8'b0;
            op2_value <= 8'b0;
            result <= 20'b0;
            display_enable <= 1'b0;
        end else begin
            case (state)
                STATE_IDLE: begin
                    if (btnr) begin
                        state <= STATE_INPUT_OPS;
                        
                        // Extract tens and ones directly from switches
                        // Limit tens digit to 0-9 and ones digit to 0-9
                        op1_tens = (switches[15:12] > 4'd9) ? 4'd9 : switches[15:12];
                        op1_ones = (switches[11:8] > 4'd9) ? 4'd9 : switches[11:8];
                        op2_tens = (switches[7:4] > 4'd9) ? 4'd9 : switches[7:4];
                        op2_ones = (switches[3:0] > 4'd9) ? 4'd9 : switches[3:0];
                        
                        // Store BCD values directly
                        operand1 <= {2'b00, op1_tens, op1_ones};
                        operand2 <= {2'b00, op2_tens, op2_ones};
                        
                        // Convert BCD to binary for calculation
                        op1_value <= bcd_to_binary(op1_tens, op1_ones);
                        op2_value <= bcd_to_binary(op2_tens, op2_ones);
                    end
                end
                
                STATE_INPUT_OPS: begin
                    if (btnl) begin
                        state <= STATE_DISPLAY;
                        // Calculate result (addition)
                        result <= {12'b0, op1_value + op2_value}; // Only keep lower 8 bits of result
                        display_enable <= 1'b1;
                    end
                end
                
                STATE_DISPLAY: begin
                    if (btnr) begin
                        state <= STATE_IDLE;
                        display_enable <= 1'b0;
                    end
                end
            endcase
        end
    end
endmodule