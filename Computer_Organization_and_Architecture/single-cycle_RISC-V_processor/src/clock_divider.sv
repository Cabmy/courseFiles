module clock_divider(
    input logic clk_in,
    input logic reset,
    output logic clk_out
);
    logic [24:0] counter;  // Increased counter width

    always_ff @(posedge clk_in or posedge reset) begin
        if (reset) begin
            counter <= 0;
            clk_out <= 0;
        end else begin
            if (counter == 25'd1000000) begin  // Slower division for better visibility
                clk_out <= ~clk_out;
                counter <= 0;
            end else begin
                counter <= counter + 1;
            end
        end
    end
endmodule